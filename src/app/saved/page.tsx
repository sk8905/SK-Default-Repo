import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { ItemCard } from "@/components/ItemCard";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const items = await db
    .select()
    .from(schema.developments)
    .where(eq(schema.developments.bookmarked, true))
    .orderBy(desc(schema.developments.publishedAt))
    .limit(100);

  return (
    <main className="min-h-screen bottom-nav-pad top-bar-pad">
      <TopBar title="Saved" />
      <div>
        {items.length === 0 ? (
          <div className="p-6 text-slate-600 text-sm">Nothing saved yet. Tap ☆ Save on an item to keep it here.</div>
        ) : (
          items.map((it) => <ItemCard key={it.id} item={it} />)
        )}
      </div>
      <BottomNav />
    </main>
  );
}
