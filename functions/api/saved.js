// Cloudflare Pages Function — per-user "saved items" storage for Meridian Legal,
// backed by KV so saved alerts/cases/restructuring matters sync across devices.
//
// Mirrors functions/api/watchlist.js (and the /api/saved handler in
// src/index.js for the Worker deployment path). Reuses the WATCHLIST KV
// namespace with a distinct key prefix ("lsv:") so it never collides with a
// watchlist. Access authenticates every request at the edge and injects the
// signed identity JWT; we key each user's saved list by their verified email.
//
// Requires the WATCHLIST KV namespace binding on the Pages project.

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

const keyFor = (email) => "lsv:" + email;

export async function onRequestGet(context) {
  const email = identity(context.request);
  if (!email) return json({ error: "unauthenticated" }, 401);
  const raw = await context.env.WATCHLIST.get(keyFor(email));
  let saved = [];
  if (raw) { try { const p = JSON.parse(raw); if (Array.isArray(p)) saved = p; } catch { /* keep default */ } }
  return json({ email, saved });
}

export async function onRequestPut(context) {
  const email = identity(context.request);
  if (!email) return json({ error: "unauthenticated" }, 401);
  let body;
  try { body = await context.request.json(); } catch { return json({ error: "invalid json" }, 400); }
  // Sanitise: a flat array of short string ids (e.g. "u562", "c40", "rx55").
  const saved = Array.isArray(body.saved)
    ? body.saved.filter((x) => typeof x === "string" && x.length <= 24).slice(0, 10000)
    : [];
  await context.env.WATCHLIST.put(keyFor(email), JSON.stringify(saved));
  return json({ ok: true });
}
