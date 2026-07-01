// Cloudflare Worker entry — serves the static site (via the ASSETS binding) and
// the per-user watchlist API at /api/watchlist plus the Meridian Legal saved-
// items API at /api/saved (both backed by the WATCHLIST KV, distinct prefixes).
//
// The whole Worker is gated by Cloudflare Access, so every request that reaches
// here is already authenticated; Access injects a signed identity JWT
// (Cf-Access-Jwt-Assertion) which we decode to key each user's watchlist by
// their verified email. Static asset requests are served before this Worker is
// invoked; anything else (the API, unknown paths) lands here.

const FOLLOW_TYPES = ["manager", "fund", "lp"];

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// Read + decode the Access JWT email claim. Access has already verified the
// token at the edge, so we only decode (not re-verify) the payload here.
function identity(request) {
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) return null;
  try {
    const part = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(part));
    return (payload.email || payload.sub || "").toLowerCase() || null;
  } catch {
    return null;
  }
}

const keyFor = (email) => "wl:" + email;
// Meridian Legal saved alerts/cases/matters — a flat array of item ids, keyed
// under a distinct prefix in the same KV namespace so it never collides with a
// watchlist. Per-user isolation comes from the verified Access email, exactly
// like the watchlist, so saved items sync across that user's devices.
const savedKeyFor = (email) => "lsv:" + email;

async function handleSaved(request, env) {
  const email = identity(request);
  if (!email) return json({ error: "unauthenticated" }, 401);

  if (request.method === "GET") {
    const raw = await env.WATCHLIST.get(savedKeyFor(email));
    let saved = [];
    if (raw) { try { const p = JSON.parse(raw); if (Array.isArray(p)) saved = p; } catch { /* keep default */ } }
    return json({ email, saved });
  }

  if (request.method === "PUT") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "invalid json" }, 400); }
    const saved = Array.isArray(body.saved)
      ? body.saved.filter((x) => typeof x === "string" && x.length <= 24).slice(0, 10000)
      : [];
    await env.WATCHLIST.put(savedKeyFor(email), JSON.stringify(saved));
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
}

async function handleWatchlist(request, env) {
  const email = identity(request);
  if (!email) return json({ error: "unauthenticated" }, 401);

  if (request.method === "GET") {
    const raw = await env.WATCHLIST.get(keyFor(email));
    let watchlist = { manager: [], fund: [], lp: [] };
    if (raw) { try { watchlist = JSON.parse(raw); } catch { /* keep default */ } }
    return json({ email, watchlist });
  }

  if (request.method === "PUT") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "invalid json" }, 400); }
    const clean = {};
    for (const t of FOLLOW_TYPES) {
      clean[t] = Array.isArray(body[t])
        ? body[t].filter((x) => typeof x === "string" && x.length <= 16).slice(0, 5000)
        : [];
    }
    await env.WATCHLIST.put(keyFor(email), JSON.stringify(clean));
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
}

// Return the signed-in identity (from the Access JWT) so the branded landing
// page can greet the user and gate entry to both /credit/ and /legal/. When the
// site is behind one Cloudflare Access application covering the whole host, a
// single sign-in authenticates every path here.
function handleMe(request) {
  const email = identity(request);
  if (!email) return json({ error: "unauthenticated" }, 401);
  return json({ email });
}

// Key rates & credit spreads for the Credit dashboard. Pulled server-side (so
// there's no CORS issue and no browser-visible key) from FRED's public, keyless
// CSV endpoint (fredgraph.csv) — one source that carries all six series. Results
// are edge-cached for 30 min since these are daily fixings.
const RATE_SERIES = [
  { id: "DGS10", label: "US 10Y", unit: "%" },
  { id: "SOFR", label: "SOFR", unit: "%" },
  { id: "IUDSOIA", label: "SONIA", unit: "%" },
  { id: "EUR3MTD156N", label: "3M EURIBOR", unit: "%" },
  { id: "BAMLC0A0CM", label: "US IG OAS", unit: "bp" },
  { id: "BAMLH0A0HYM2", label: "US HY OAS", unit: "bp" },
];

async function fredLast(id) {
  const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, {
    cf: { cacheTtl: 1800, cacheEverything: true },
  });
  if (!r.ok) throw new Error("fred " + r.status);
  const rows = (await r.text()).trim().split(/\r?\n/).slice(1)
    .map((l) => l.split(","))
    .filter((c) => c.length >= 2 && c[1] !== "" && c[1] !== ".");
  const last = rows[rows.length - 1], prev = rows[rows.length - 2];
  const val = last ? parseFloat(last[1]) : null;
  const prevVal = prev ? parseFloat(prev[1]) : null;
  return {
    value: Number.isFinite(val) ? val : null,
    change: (Number.isFinite(val) && Number.isFinite(prevVal)) ? +(val - prevVal).toFixed(4) : null,
    asOf: last ? last[0] : null,
  };
}

async function handleRates(request, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/rates", request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const data = await Promise.all(RATE_SERIES.map(async (s) => {
    try { return { ...s, ...(await fredLast(s.id)) }; }
    catch { return { ...s, value: null, change: null, asOf: null }; }
  }));
  const resp = new Response(JSON.stringify({ rates: data }), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=1800" },
  });
  if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, resp.clone()));
  return resp;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/rates") return handleRates(request, env, ctx);
    if (url.pathname === "/api/watchlist") return handleWatchlist(request, env);
    if (url.pathname === "/api/saved") return handleSaved(request, env);
    if (url.pathname === "/api/me") return handleMe(request);
    // Sign-in helper: hitting this behind Access triggers the Access login,
    // then bounces the user to `to` (default the landing page).
    if (url.pathname === "/api/login") {
      const to = url.searchParams.get("to") || "/";
      const dest = to.startsWith("/") ? to : "/";
      return Response.redirect(new URL(dest, url.origin).toString(), 302);
    }
    // Everything else: serve the static site.
    return env.ASSETS.fetch(request);
  },
};
