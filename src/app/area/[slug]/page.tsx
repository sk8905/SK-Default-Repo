import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { ItemCard } from "@/components/ItemCard";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { AREAS, isAreaSlug } from "@/lib/areas";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AreaPage({ params }: { params: { slug: string } }) {
  noStore();
  if (!isAreaSlug(params.slug)) notFound();
  const area = AREAS[params.slug];
  const items = await db
    .select()
    .from(schema.developments)
    .where(eq(schema.developments.area, params.slug))
    .orderBy(desc(schema.developments.publishedAt))
    .limit(100);

  return (
    <main className="min-h-screen bottom-nav-pad top-bar-pad">
      <TopBar title={area.label} />
      <div>
        {items.length === 0 ? (
          <div className="p-6 text-slate-600 text-sm">No items in this area yet.</div>
        ) : (
          items.map((it) => <ItemCard key={it.id} item={it} />)
        )}
      </div>
      <BottomNav />
    </main>
  );
}
