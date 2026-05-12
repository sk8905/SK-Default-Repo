import { NextResponse } from "next/server";
import { FEEDS } from "@/lib/sources";
import { fetchFeed } from "@/lib/rss";

export const runtime = "nodejs";
export const maxDuration = 60;

// Health check for the configured RSS feeds. Use this after deploy to see
// which firms need their feed URL updated in src/lib/sources.ts.
export async function GET() {
  const results = await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const items = await fetchFeed(f.feedUrl);
        return { firm: f.firmName, url: f.feedUrl, ok: true, count: items.length, latest: items[0]?.publishedAt || null };
      } catch (e) {
        return { firm: f.firmName, url: f.feedUrl, ok: false, error: (e as Error).message };
      }
    }),
  );
  return NextResponse.json({ results });
}
