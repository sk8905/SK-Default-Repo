import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthCookie } from "@/lib/auth";

export const config = {
  matcher: ["/((?!login|api/auth/login|api/cron|api/ingest/seed|api/setup|api/debug|_next/static|_next/image|favicon|manifest.json|sw.js|icons|robots.txt).*)"],
};

export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const ok = await verifyAuthCookie(cookie, process.env.APP_PASSWORD);
  if (ok) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
