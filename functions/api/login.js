// Cloudflare Pages Function — sign-in helper, mirroring the /api/login route in
// src/index.js (the Worker deploy path). Hitting this behind Cloudflare Access
// triggers the Access login, then bounces the user to `to` (default the landing
// page). Kept in sync with the Worker so both deploy paths expose /api/login.

export function onRequest(context) {
  const url = new URL(context.request.url);
  const to = url.searchParams.get("to") || "/";
  const dest = to.startsWith("/") ? to : "/";
  return Response.redirect(new URL(dest, url.origin).toString(), 302);
}
