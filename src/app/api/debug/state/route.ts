import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, sql } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Authoritative DB-state diagnostic. Returns raw row counts and a sample of
// recent items so we can verify what's actually in Neon (vs what the UI shows).
export async function GET() {
  noStore();

  const totalRows = await db.select({ n: sql<number>`count(*)::int` }).from(schema.developments);
  const total = totalRows[0]?.n ?? 0;

  const perArea = await db
    .select({ area: schema.developments.area, n: sql<number>`count(*)::int` })
    .from(schema.developments)
    .groupBy(schema.developments.area);

  const recent = await db
    .select({
      id: schema.developments.id,
      title: schema.developments.title,
      area: schema.developments.area,
      firmName: schema.developments.firmName,
      publishedAt: schema.developments.publishedAt,
      ingestedAt: schema.developments.ingestedAt,
    })
    .from(schema.developments)
    .orderBy(desc(schema.developments.ingestedAt))
    .limit(20);

  const runs = await db
    .select()
    .from(schema.ingestRuns)
    .orderBy(desc(schema.ingestRuns.startedAt))
    .limit(5);

  return NextResponse.json({ total, perArea, recent, runs });
}
