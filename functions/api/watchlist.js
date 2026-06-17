// Cloudflare Pages Function — per-user watchlist storage backed by KV.
//
// This endpoint is only reachable on Cloudflare Pages, behind Cloudflare Access.
// Access authenticates every request at the edge BEFORE it reaches this code and
// injects a signed identity JWT (Cf-Access-Jwt-Assertion). We key each user's
// watchlist by their verified email claim, so the data syncs across devices for
// that one identity and is isolated per user.
//
// Requires a KV namespace binding named WATCHLIST on the Pages project.

const FOLLOW_TYPES = ["manager", "fund", "lp"];

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// Read the email from the Access JWT. Access has already verified the token at
// the edge, so we only need to decode (not re-verify) the payload here.
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

export async function onRequestGet(context) {
  const email = identity(context.request);
  if (!email) return json({ error: "unauthenticated" }, 401);
  const raw = await context.env.WATCHLIST.get(keyFor(email));
  let watchlist = { manager: [], fund: [], lp: [] };
  if (raw) { try { watchlist = JSON.parse(raw); } catch { /* keep default */ } }
  return json({ email, watchlist });
}

export async function onRequestPut(context) {
  const email = identity(context.request);
  if (!email) return json({ error: "unauthenticated" }, 401);
  let body;
  try { body = await context.request.json(); } catch { return json({ error: "invalid json" }, 400); }
  // Sanitise: keep only arrays of short string ids under the known keys.
  const clean = {};
  for (const t of FOLLOW_TYPES) {
    clean[t] = Array.isArray(body[t])
      ? body[t].filter((x) => typeof x === "string" && x.length <= 16).slice(0, 5000)
      : [];
  }
  await context.env.WATCHLIST.put(keyFor(email), JSON.stringify(clean));
  return json({ ok: true });
}
