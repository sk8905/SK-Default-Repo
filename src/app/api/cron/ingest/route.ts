import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

// Called by Vercel Cron daily. Vercel injects a Bearer token equal to CRON_SECRET
// when the env var is set; we also accept a manual ?secret= query for testing.
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization");
    const url = new URL(req.url);
    const fromQuery = url.searchParams.get("secret");
    const ok = auth === `Bearer ${expected}` || fromQuery === expected;
    if (!ok) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  // Daily run: last 2 days is enough to catch anything new (with dedupe by hash).
  const result = await runIngest({ sinceDays: 2 });
  return NextResponse.json(result);
}
