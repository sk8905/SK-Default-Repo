import { pgTable, serial, text, timestamp, varchar, boolean, integer, index, uniqueIndex } from "drizzle-orm/pg-core";

export const developments = pgTable(
  "developments",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    area: varchar("area", { length: 32 }).notNull(),
    firmName: varchar("firm_name", { length: 128 }).notNull(),
    sourceUrl: text("source_url").notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
    bookmarked: boolean("bookmarked").default(false).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => ({
    hashIdx: uniqueIndex("developments_hash_idx").on(t.contentHash),
    areaIdx: index("developments_area_idx").on(t.area),
    publishedIdx: index("developments_published_idx").on(t.publishedAt),
  }),
);

export const ingestRuns = pgTable("ingest_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  feedsChecked: integer("feeds_checked").default(0).notNull(),
  itemsFetched: integer("items_fetched").default(0).notNull(),
  itemsAdded: integer("items_added").default(0).notNull(),
  itemsSkipped: integer("items_skipped").default(0).notNull(),
  errors: text("errors"),
});

export type Development = typeof developments.$inferSelect;
export type NewDevelopment = typeof developments.$inferInsert;
