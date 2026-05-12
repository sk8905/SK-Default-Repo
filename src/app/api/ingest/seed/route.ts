import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

// One-shot 30-day historical seed. Protected by CRON_SECRET.
// Usage: GET /api/ingest/seed?secret=<CRON_SECRET>&days=30
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!expected || secret !== expected) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const days = Number(url.searchParams.get("days") || 30);
  const result = await runIngest({ sinceDays: days, perFeedLimit: 10 });
  return NextResponse.json(result);
}
