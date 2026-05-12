import { createHash } from "node:crypto";
import { db, schema } from "./db";
import { FEEDS } from "./sources";
import { fetchFeed, type FeedItem } from "./rss";
import { classifyAndSummarise } from "./classify";
import { sql } from "drizzle-orm";

export type IngestSummary = {
  feedsChecked: number;
  itemsFetched: number;
  itemsAdded: number;
  itemsSkipped: number;
  errors: string[];
};

function hashItem(firm: string, url: string, title: string): string {
  return createHash("sha256").update(`${firm}|${url}|${title}`).digest("hex");
}

function hasUkSignal(item: FeedItem, hints?: string[]): boolean {
  if (!hints || hints.length === 0) return true;
  const haystack = `${item.title} ${item.description} ${item.content}`.toLowerCase();
  return hints.some((h) => haystack.includes(h.toLowerCase()));
}

export async function runIngest(opts: { sinceDays: number; perFeedLimit?: number } = { sinceDays: 30, perFeedLimit: 25 }): Promise<IngestSummary> {
  const sinceDays = opts.sinceDays ?? 30;
  const perFeedLimit = opts.perFeedLimit ?? 25;
  const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const summary: IngestSummary = { feedsChecked: 0, itemsFetched: 0, itemsAdded: 0, itemsSkipped: 0, errors: [] };

  const runRow = await db
    .insert(schema.ingestRuns)
    .values({ feedsChecked: 0, itemsFetched: 0, itemsAdded: 0, itemsSkipped: 0 })
    .returning({ id: schema.ingestRuns.id });
  const runId = runRow[0]?.id;

  for (const feed of FEEDS) {
    summary.feedsChecked++;
    let items: FeedItem[];
    try {
      items = await fetchFeed(feed.feedUrl);
    } catch (e) {
      summary.errors.push(`${feed.firmName}: ${(e as Error).message}`);
      continue;
    }

    const recent = items.filter((it) => it.publishedAt >= cutoff && hasUkSignal(it, feed.englandHints)).slice(0, perFeedLimit);

    for (const it of recent) {
      summary.itemsFetched++;
      const hash = hashItem(feed.firmName, it.url, it.title);

      // Skip if we've seen this item before.
      const existing = await db
        .select({ id: schema.developments.id })
        .from(schema.developments)
        .where(sql`${schema.developments.contentHash} = ${hash}`)
        .limit(1);
      if (existing.length > 0) {
        summary.itemsSkipped++;
        continue;
      }

      let result;
      try {
        result = await classifyAndSummarise({
          firmName: feed.firmName,
          title: it.title,
          body: it.content || it.description,
        });
      } catch (e) {
        summary.errors.push(`classify ${feed.firmName} "${it.title.slice(0, 60)}": ${(e as Error).message}`);
        continue;
      }

      if (result.area === "irrelevant") {
        summary.itemsSkipped++;
        continue;
      }

      try {
        await db.insert(schema.developments).values({
          title: it.title,
          summary: result.summary,
          area: result.area,
          firmName: feed.firmName,
          sourceUrl: it.url,
          contentHash: hash,
          publishedAt: it.publishedAt,
        });
        summary.itemsAdded++;
      } catch (e) {
        // Race on the unique hash index, etc.
        summary.errors.push(`insert ${feed.firmName} "${it.title.slice(0, 60)}": ${(e as Error).message}`);
      }
    }
  }

  if (runId !== undefined) {
    await db
      .update(schema.ingestRuns)
      .set({
        finishedAt: new Date(),
        feedsChecked: summary.feedsChecked,
        itemsFetched: summary.itemsFetched,
        itemsAdded: summary.itemsAdded,
        itemsSkipped: summary.itemsSkipped,
        errors: summary.errors.length ? summary.errors.join("\n") : null,
      })
      .where(sql`${schema.ingestRuns.id} = ${runId}`);
  }

  return summary;
}
