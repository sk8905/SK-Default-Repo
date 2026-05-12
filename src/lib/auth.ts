// Edge-compatible auth using Web Crypto (works in both Next.js middleware and Node).
// The cookie is `v1.<exp>.<hex-hmac-sha256(payload, APP_PASSWORD)>`.
// Single-user app; this is a simple gate, not a full auth system.

const COOKIE_NAME = "lu_auth";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const enc = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
  return s;
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toHex(sig);
}

export async function issueAuthCookieValue(secret: string): Promise<{ name: string; value: string; maxAge: number }> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `v1.${exp}`;
  const mac = await sign(payload, secret);
  return { name: COOKIE_NAME, value: `${payload}.${mac}`, maxAge: MAX_AGE_SECONDS };
}

export async function verifyAuthCookie(value: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!value || !secret) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [v, expStr, mac] = parts;
  if (v !== "v1") return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await sign(`${v}.${expStr}`, secret);
  return constantTimeEqual(fromHex(mac), fromHex(expected));
}

export function checkPassword(input: string, secret: string | undefined): boolean {
  if (!secret) return false;
  if (input.length !== secret.length) return false;
  return constantTimeEqual(enc.encode(input), enc.encode(secret));
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
