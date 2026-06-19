// Cloudflare Worker entry — serves the static site (via the ASSETS binding) and
// the per-user watchlist API at /api/watchlist (backed by the WATCHLIST KV).
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/watchlist") return handleWatchlist(request, env);
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
