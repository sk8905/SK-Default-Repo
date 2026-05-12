import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { ItemCard } from "@/components/ItemCard";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const items = await db.select().from(schema.developments).orderBy(desc(schema.developments.publishedAt)).limit(50);
  return (
    <main className="min-h-screen bottom-nav-pad top-bar-pad">
      <TopBar title="Legal Updates" right={<Link href="/settings" className="opacity-80">Settings</Link>} />
      <div>
        {items.length === 0 ? (
          <div className="p-6 text-slate-600 text-sm">
            No items yet. Run the seeder (see README) or wait for the next scheduled ingest.
          </div>
        ) : (
          items.map((it) => <ItemCard key={it.id} item={it} />)
        )}
      </div>
      <BottomNav />
    </main>
  );
}
