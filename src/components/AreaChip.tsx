import { AREAS, type AreaSlug } from "@/lib/areas";

export function AreaChip({ area }: { area: AreaSlug }) {
  const a = AREAS[area];
  return <span className={`inline-block text-[11px] uppercase tracking-wide font-sans border px-2 py-0.5 rounded ${a.colour}`}>{a.short}</span>;
}
