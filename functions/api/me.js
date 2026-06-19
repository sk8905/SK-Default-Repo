// Cloudflare Pages Function — returns the signed-in identity from the Access JWT
// so the branded landing page can greet the user and gate entry to both apps.
//
// Behind one Cloudflare Access application covering the whole host, a single
// sign-in authenticates every path. Access verifies the token at the edge and
// injects Cf-Access-Jwt-Assertion; we only decode (not re-verify) the email.
// (The Worker equivalent lives in src/index.js — this file is used on the Pages
// path and is unused on the Worker path.)

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

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

export function onRequestGet(context) {
  const email = identity(context.request);
  if (!email) return json({ error: "unauthenticated" }, 401);
  return json({ email });
}
