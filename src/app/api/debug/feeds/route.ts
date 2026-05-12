import { NextResponse } from "next/server";
import { FEEDS } from "@/lib/sources";
import { fetchFirstWorkingFeed } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 120;

// Health check for the configured feeds. Reports which URL (if any) is currently
// working per firm/aggregator. Use this to spot dead feeds.
export async function GET() {
  const results = await Promise.all(
    FEEDS.map(async (f) => {
      const { items, workingUrl, errors } = await fetchFirstWorkingFeed(f);
      return {
        firm: f.firmName,
        ok: workingUrl !== null,
        workingUrl,
        count: items.length,
        latest: items[0]?.publishedAt ?? null,
        candidatesTried: f.feedUrls.length,
        errors: workingUrl ? [] : errors,
      };
    }),
  );
  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({ total: results.length, working: okCount, results });
}
