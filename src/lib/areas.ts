export const AREAS = {
  banking: {
    slug: "banking",
    label: "Banking & Finance",
    short: "B&F",
    colour: "bg-emerald-100 text-emerald-900 border-emerald-300",
  },
  restructuring: {
    slug: "restructuring",
    label: "Restructuring & Insolvency",
    short: "R&I",
    colour: "bg-amber-100 text-amber-900 border-amber-300",
  },
  corporate: {
    slug: "corporate",
    label: "Corporate",
    short: "Corp",
    colour: "bg-sky-100 text-sky-900 border-sky-300",
  },
  fundsreg: {
    slug: "fundsreg",
    label: "Investment Fund Regulatory",
    short: "Funds Reg",
    colour: "bg-violet-100 text-violet-900 border-violet-300",
  },
  fundstax: {
    slug: "fundstax",
    label: "Corporate & Investment Fund Tax",
    short: "Tax",
    colour: "bg-rose-100 text-rose-900 border-rose-300",
  },
} as const;

export type AreaSlug = keyof typeof AREAS;
export const AREA_SLUGS = Object.keys(AREAS) as AreaSlug[];

export function isAreaSlug(s: string): s is AreaSlug {
  return s in AREAS;
}
