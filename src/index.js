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
// there's no CORS issue and no browser-visible key). Five series come from FRED's
// public keyless CSV feed; 3M EURIBOR comes from the ECB Data Portal (also
// keyless) since FRED has no live daily EURIBOR (its EUR3MTD156N was Euro LIBOR,
// discontinued). Results are edge-cached 30 min (these are daily fixings), but
// only when fully populated so a transient upstream miss can't stick.
const RATE_SERIES = [
  // EURIBOR is published on TARGET business days; ECB's business-daily frequency
  // code is "B" (not "D"). Try business-daily, then daily, then monthly average
  // as a guaranteed fallback so the tile always resolves.
  { label: "3M EURIBOR", unit: "%", src: "ecb", keys: [
    "B.U2.EUR.RT.MM.EURIBOR3MD_.HSTA",
    "D.U2.EUR.RT.MM.EURIBOR3MD_.HSTA",
    "M.U2.EUR.RT.MM.EURIBOR3MD_.HSTA",
  ] },
  { label: "SOFR", unit: "%", src: "fred", id: "SOFR" },
  { label: "SONIA", unit: "%", src: "fred", id: "IUDSOIA" },
  { label: "US 10Y", unit: "%", src: "fred", id: "DGS10" },
  { label: "US IG OAS", unit: "bp", src: "fred", id: "BAMLC0A0CM" },
  { label: "US HY OAS", unit: "bp", src: "fred", id: "BAMLH0A0HYM2" },
];

// Fetch text with one retry; small CSVs so this is cheap. Only 200s are cached
// (no cacheEverything) so a transient 404 is never held.
async function fetchText(url) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url, {
        headers: { "accept": "text/csv, application/json, */*", "user-agent": "Meridian/1.0 (+workers)" },
        cf: { cacheTtl: 900 },
      });
      if (r.ok) return await r.text();
    } catch { /* retry */ }
  }
  return null;
}

// Given [date, valueStr] pairs (any order), return the latest value + day change.
function lastTwo(pairs) {
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const last = pairs[pairs.length - 1], prev = pairs[pairs.length - 2];
  const val = last ? parseFloat(last[1]) : null;
  const prevVal = prev ? parseFloat(prev[1]) : null;
  return {
    value: Number.isFinite(val) ? val : null,
    change: (Number.isFinite(val) && Number.isFinite(prevVal)) ? +(val - prevVal).toFixed(4) : null,
    asOf: last ? last[0] : null,
  };
}

async function fredSeries(id, cosd) {
  const txt = await fetchText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${cosd}`);
  if (!txt) return { value: null, change: null, asOf: null };
  const pairs = txt.trim().split(/\r?\n/).slice(1)
    .map((l) => l.split(","))
    .filter((c) => c.length >= 2 && c[1] !== "" && c[1] !== ".")
    .map((c) => [c[0], c[1]]);
  return lastTwo(pairs);
}

async function ecbSeries(keys) {
  for (const key of keys) {
    const txt = await fetchText(`https://data-api.ecb.europa.eu/service/data/FM/${key}?lastNObservations=6&format=csvdata`);
    if (!txt) continue;
    const lines = txt.trim().split(/\r?\n/);
    if (lines.length < 2) continue;
    const h = lines[0].split(",");
    const ti = h.indexOf("TIME_PERIOD"), vi = h.indexOf("OBS_VALUE");
    if (ti < 0 || vi < 0) continue;
    const pairs = lines.slice(1)
      .map((l) => l.split(","))
      .filter((c) => c[vi] !== undefined && c[vi] !== "")
      .map((c) => [c[ti], c[vi]]);
    if (pairs.length) return lastTwo(pairs);
  }
  return { value: null, change: null, asOf: null };
}

async function handleRates(request, env, ctx) {
  const cache = caches.default;
  // Versioned key so a previously-cached partial response is ignored.
  const cacheKey = new Request(new URL("/api/rates?v=4", request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  // Only the last ~60 days, so each FRED CSV is small and fast.
  const cosd = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  const data = await Promise.all(RATE_SERIES.map(async (s) => {
    const r = s.src === "ecb" ? await ecbSeries(s.keys) : await fredSeries(s.id, cosd);
    return { label: s.label, unit: s.unit, value: r.value, change: r.change, asOf: r.asOf };
  }));
  const resp = new Response(JSON.stringify({ rates: data }), {
    // Short browser cache (band also caches in-module per load); edge does the heavy lifting.
    headers: { "content-type": "application/json", "cache-control": "public, max-age=300" },
  });
  // Only cache once every series resolved, so a transient miss doesn't stick 30 min.
  if (ctx && ctx.waitUntil && data.every((d) => d.value != null)) {
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
  }
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
