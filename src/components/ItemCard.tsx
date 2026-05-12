import Link from "next/link";
import type { Development } from "@/lib/db/schema";
import { AreaChip } from "./AreaChip";
import { isAreaSlug } from "@/lib/areas";

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function ItemCard({ item }: { item: Development }) {
  return (
    <Link href={`/item/${item.id}`} className="block border-b border-slate-200 px-4 py-4 active:bg-slate-100">
      <div className="flex items-center gap-2 mb-1 font-sans text-xs text-slate-600">
        {isAreaSlug(item.area) && <AreaChip area={item.area} />}
        <span>{item.firmName}</span>
        <span>·</span>
        <span>{fmtDate(new Date(item.publishedAt))}</span>
      </div>
      <h3 className="font-serif text-base leading-snug text-ink">{item.title}</h3>
      <p className="mt-1 text-sm text-slate-700 line-clamp-3">{item.summary}</p>
    </Link>
  );
}
