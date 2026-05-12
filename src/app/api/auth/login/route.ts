import { NextResponse } from "next/server";
import { checkPassword, issueAuthCookieValue, AUTH_COOKIE_NAME } from "@/lib/auth";

export const runtime = "edge";

export async function POST(req: Request) {
  const { password } = (await req.json()) as { password?: string };
  const secret = process.env.APP_PASSWORD;
  if (!secret) return NextResponse.json({ error: "APP_PASSWORD not configured" }, { status: 500 });
  if (!password || !checkPassword(password, secret)) {
    return NextResponse.json({ error: "bad password" }, { status: 401 });
  }
  const cookie = await issueAuthCookieValue(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: cookie.value,
    maxAge: cookie.maxAge,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
  return res;
}
