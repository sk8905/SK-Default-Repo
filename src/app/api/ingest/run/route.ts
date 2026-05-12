import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  const result = await runIngest({ sinceDays: 30 });
  return NextResponse.json(result);
}
