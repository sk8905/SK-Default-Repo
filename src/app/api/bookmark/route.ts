import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { id, bookmarked } = (await req.json()) as { id?: number; bookmarked?: boolean };
  if (typeof id !== "number" || typeof bookmarked !== "boolean") {
    return NextResponse.json({ error: "bad input" }, { status: 400 });
  }
  await db.update(schema.developments).set({ bookmarked }).where(eq(schema.developments.id, id));
  return NextResponse.json({ ok: true });
}
