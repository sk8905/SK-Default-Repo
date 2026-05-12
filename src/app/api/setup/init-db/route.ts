import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const maxDuration = 60;

// One-shot database initialisation. Idempotent (safe to re-run).
// Protected by CRON_SECRET.
// Usage: GET /api/setup/init-db?secret=<CRON_SECRET>
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });

  const sql = neon(databaseUrl);

  await sql`
    CREATE TABLE IF NOT EXISTS developments (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      area VARCHAR(32) NOT NULL,
      firm_name VARCHAR(128) NOT NULL,
      source_url TEXT NOT NULL,
      content_hash VARCHAR(64) NOT NULL,
      published_at TIMESTAMPTZ NOT NULL,
      ingested_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      bookmarked BOOLEAN DEFAULT false NOT NULL,
      read_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS developments_hash_idx ON developments (content_hash)`;
  await sql`CREATE INDEX IF NOT EXISTS developments_area_idx ON developments (area)`;
  await sql`CREATE INDEX IF NOT EXISTS developments_published_idx ON developments (published_at)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ingest_runs (
      id SERIAL PRIMARY KEY,
      started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      finished_at TIMESTAMPTZ,
      feeds_checked INTEGER DEFAULT 0 NOT NULL,
      items_fetched INTEGER DEFAULT 0 NOT NULL,
      items_added INTEGER DEFAULT 0 NOT NULL,
      items_skipped INTEGER DEFAULT 0 NOT NULL,
      errors TEXT
    )
  `;

  return NextResponse.json({ ok: true, message: "Database initialised." });
}
