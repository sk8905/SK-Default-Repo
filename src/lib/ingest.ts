import { createHash } from "node:crypto";
import { db, schema } from "./db";
import { FEEDS, type FirmFeed } from "./sources";
import { fetchFeed, type FeedItem } from "./rss";
import { classifyAndSummarise } from "./classify";
import { sql } from "drizzle-orm";

export type IngestSummary = {
  feedsChecked: number;
  feedsWorking: number;
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

export async function fetchFirstWorkingFeed(feed: FirmFeed): Promise<{ items: FeedItem[]; workingUrl: string | null; errors: string[] }> {
  const errors: string[] = [];
  for (const url of feed.feedUrls) {
    try {
      const items = await fetchFeed(url, 8000);
      if (items.length > 0) return { items, workingUrl: url, errors };
      errors.push(`${url}: empty feed`);
    } catch (e) {
      errors.push(`${url}: ${(e as Error).message}`);
    }
  }
  return { items: [], workingUrl: null, errors };
}

export async function runIngest(opts: { sinceDays: number; perFeedLimit?: number } = { sinceDays: 30, perFeedLimit: 8 }): Promise<IngestSummary> {
  const sinceDays = opts.sinceDays ?? 30;
  const perFeedLimit = opts.perFeedLimit ?? 8;
  const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const summary: IngestSummary = { feedsChecked: 0, feedsWorking: 0, itemsFetched: 0, itemsAdded: 0, itemsSkipped: 0, errors: [] };

  const runRow = await db
    .insert(schema.ingestRuns)
    .values({ feedsChecked: 0, itemsFetched: 0, itemsAdded: 0, itemsSkipped: 0 })
    .returning({ id: schema.ingestRuns.id });
  const runId = runRow[0]?.id;

  // Phase 1: fetch every feed in parallel.
  const fetched = await Promise.all(
    FEEDS.map(async (feed) => {
      const result = await fetchFirstWorkingFeed(feed);
      return { feed, ...result };
    }),
  );
  summary.feedsChecked = fetched.length;

  // Phase 2: collect candidate items per feed (filtered by date + UK signal).
  type Pending = { feed: FirmFeed; item: FeedItem };
  const pending: Pending[] = [];
  for (const { feed, items, workingUrl, errors } of fetched) {
    if (!workingUrl) {
      summary.errors.push(`${feed.firmName}: ${errors.slice(0, 3).join("; ")}`);
      continue;
    }
    summary.feedsWorking++;
    const recent = items
      .filter((it) => it.publishedAt >= cutoff && hasUkSignal(it, feed.englandHints))
      .slice(0, perFeedLimit);
    for (const item of recent) {
      pending.push({ feed, item });
      summary.itemsFetched++;
    }
  }

  // Phase 3: dedupe + classify + insert. Classifier calls are batched in parallel.
  const BATCH = 4;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async ({ feed, item }) => {
        const hash = hashItem(feed.firmName, item.url, item.title);
        const existing = await db
          .select({ id: schema.developments.id })
          .from(schema.developments)
          .where(sql`${schema.developments.contentHash} = ${hash}`)
          .limit(1);
        if (existing.length > 0) {
          summary.itemsSkipped++;
          return;
        }
        let result;
        try {
          result = await classifyAndSummarise({
            firmName: feed.firmName,
            title: item.title,
            body: item.content || item.description,
          });
        } catch (e) {
          summary.errors.push(`classify ${feed.firmName} "${item.title.slice(0, 60)}": ${(e as Error).message}`);
          return;
        }
        if (result.area === "irrelevant") {
          summary.itemsSkipped++;
          return;
        }
        try {
          await db.insert(schema.developments).values({
            title: item.title,
            summary: result.summary,
            area: result.area,
            firmName: feed.firmName,
            sourceUrl: item.url,
            contentHash: hash,
            publishedAt: item.publishedAt,
          });
          summary.itemsAdded++;
        } catch (e) {
          summary.errors.push(`insert ${feed.firmName} "${item.title.slice(0, 60)}": ${(e as Error).message}`);
        }
      }),
    );
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
