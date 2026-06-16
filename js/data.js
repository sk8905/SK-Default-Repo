// =============================================================================
// Meridian Credit Intelligence — sample dataset
// -----------------------------------------------------------------------------
// All firms, funds, investors and intelligence items below are FICTIONAL and
// created for demonstration only. Any resemblance to real entities is
// coincidental. Figures are illustrative.
// Focus universe: European private credit / alternative credit fundraising.
// =============================================================================

export const STRATEGIES = [
  "Senior Direct Lending",
  "Unitranche",
  "Mezzanine / Junior Debt",
  "Distressed & Special Situations",
  "Structured Credit / CLO",
  "Real Estate Debt",
  "Infrastructure Debt",
  "Asset-Based Lending",
  "Opportunistic Credit",
  "NAV / Fund Finance",
];

export const FUND_STATUS = [
  "Pre-marketing",
  "Open",
  "First Close",
  "Final Close",
];

export const GEOS = [
  "Pan-European",
  "UK & Ireland",
  "DACH",
  "France & Benelux",
  "Nordics",
  "Southern Europe",
];

export const LP_TYPES = [
  "Public Pension",
  "Corporate Pension",
  "Insurance",
  "Sovereign Wealth Fund",
  "Fund of Funds",
  "Family Office",
  "Endowment / Foundation",
  "Bank / Treasury",
];

// ---------------------------------------------------------------------------
// Managers (GPs)
// ---------------------------------------------------------------------------
export const managers = [
  { id: "m1",  name: "Thornbury Capital Partners", hq: "London, UK",        founded: 2009, aum: 18.4, employees: 210, strategies: ["Senior Direct Lending","Unitranche"], description: "Pan-European mid-market direct lender focused on sponsor-backed buyouts. One of the most active unitranche providers in the UK and DACH." },
  { id: "m2",  name: "Vandermeer Credit",          hq: "Amsterdam, NL",     founded: 2012, aum: 9.7,  employees: 95,  strategies: ["Unitranche","Mezzanine / Junior Debt"], description: "Benelux-rooted lower-mid-market specialist with a flexible capital approach spanning senior to junior debt." },
  { id: "m3",  name: "Helvetia Private Debt",       hq: "Zurich, CH",        founded: 2014, aum: 6.2,  employees: 70,  strategies: ["Senior Direct Lending","Infrastructure Debt"], description: "DACH-focused lender backed by a Swiss insurance heritage; conservative senior-secured underwriting." },
  { id: "m4",  name: "Aldgate Special Situations",  hq: "London, UK",        founded: 2007, aum: 12.1, employees: 130, strategies: ["Distressed & Special Situations","Opportunistic Credit"], description: "Value-oriented distressed and special situations manager active across European corporate stress and dislocation." },
  { id: "m5",  name: "Lumière Asset Management",     hq: "Paris, FR",         founded: 2011, aum: 14.8, employees: 160, strategies: ["Senior Direct Lending","Real Estate Debt"], description: "French champion in private debt and commercial real estate lending across France & Benelux." },
  { id: "m6",  name: "Nordlys Kapital",             hq: "Stockholm, SE",     founded: 2015, aum: 4.5,  employees: 48,  strategies: ["Senior Direct Lending","Unitranche"], description: "Nordic-focused direct lender serving Sweden, Norway, Denmark and Finland mid-market borrowers." },
  { id: "m7",  name: "Castellano Credit",            hq: "Milan, IT",         founded: 2013, aum: 5.1,  employees: 55,  strategies: ["Asset-Based Lending","Opportunistic Credit"], description: "Southern European specialist in asset-backed and opportunistic credit, including Italian and Iberian SME lending." },
  { id: "m8",  name: "Kingsmoor Infrastructure",     hq: "London, UK",        founded: 2010, aum: 16.3, employees: 120, strategies: ["Infrastructure Debt"], description: "Dedicated infrastructure debt platform financing energy transition, digital and transport assets across Europe." },
  { id: "m9",  name: "Brandt & Holm Partners",       hq: "Frankfurt, DE",     founded: 2008, aum: 11.0, employees: 105, strategies: ["Mezzanine / Junior Debt","Senior Direct Lending"], description: "German Mittelstand financing house with a long track record in junior and stretch-senior debt." },
  { id: "m10", name: "Sefton Structured Credit",     hq: "London, UK",        founded: 2006, aum: 22.5, employees: 175, strategies: ["Structured Credit / CLO"], description: "Leading European CLO manager and structured-credit investor with a multi-vintage platform." },
  { id: "m11", name: "Atlas Iberia Debt",            hq: "Madrid, ES",        founded: 2016, aum: 3.2,  employees: 36,  strategies: ["Real Estate Debt","Asset-Based Lending"], description: "Iberian real estate and asset-based credit manager targeting Spain and Portugal recovery lending." },
  { id: "m12", name: "Greenfield NAV Solutions",     hq: "London, UK",        founded: 2018, aum: 7.4,  employees: 42,  strategies: ["NAV / Fund Finance"], description: "Specialist provider of NAV facilities and GP/LP fund finance to European private capital sponsors." },
  { id: "m13", name: "Roosevelt Mezzanine Europe",   hq: "Luxembourg, LU",    founded: 2011, aum: 8.9,  employees: 60,  strategies: ["Mezzanine / Junior Debt","Opportunistic Credit"], description: "Pan-European junior capital provider offering mezzanine, PIK and preferred equity solutions." },
  { id: "m14", name: "Caledonia Direct Lending",     hq: "Edinburgh, UK",     founded: 2013, aum: 6.8,  employees: 58,  strategies: ["Senior Direct Lending","Unitranche"], description: "UK & Ireland lower-mid-market lender with deep regional sourcing relationships." },
];

// ---------------------------------------------------------------------------
// Funds — targetSize / hardCap / raised in € millions
// ---------------------------------------------------------------------------
export const funds = [
  { id: "f1",  name: "Thornbury Direct Lending Fund V",        managerId: "m1",  strategy: "Senior Direct Lending",          vintage: 2025, targetSize: 5000, hardCap: 6000, raised: 4100, status: "Open",          domicile: "Luxembourg", geoFocus: "Pan-European",       sectorFocus: "Diversified",            description: "Fifth-generation flagship senior direct lending fund targeting €5bn for sponsor-backed European mid-market loans." },
  { id: "f2",  name: "Thornbury Unitranche Opportunities II",  managerId: "m1",  strategy: "Unitranche",                     vintage: 2024, targetSize: 2500, hardCap: 3000, raised: 3000, status: "Final Close",    domicile: "Luxembourg", geoFocus: "UK & Ireland",       sectorFocus: "Technology & Services", description: "Closed at hard cap of €3bn for first-lien unitranche financings in the UK and DACH regions." },
  { id: "f3",  name: "Vandermeer Flexible Credit III",         managerId: "m2",  strategy: "Unitranche",                     vintage: 2025, targetSize: 1800, hardCap: 2200, raised: 950,  status: "First Close",    domicile: "Luxembourg", geoFocus: "France & Benelux",   sectorFocus: "Diversified",            description: "Lower-mid-market flexible capital fund; held a €950m first close ahead of target." },
  { id: "f4",  name: "Helvetia Senior Secured Fund II",        managerId: "m3",  strategy: "Senior Direct Lending",          vintage: 2025, targetSize: 1500, hardCap: 1800, raised: 600,  status: "Open",          domicile: "Luxembourg", geoFocus: "DACH",               sectorFocus: "Healthcare & Industrials", description: "Conservative senior-secured DACH lending vehicle currently in active fundraising." },
  { id: "f5",  name: "Aldgate Special Situations Fund IV",     managerId: "m4",  strategy: "Distressed & Special Situations",vintage: 2025, targetSize: 3500, hardCap: 4000, raised: 2300, status: "Open",          domicile: "Ireland",    geoFocus: "Pan-European",       sectorFocus: "Diversified",            description: "Targets European corporate distress, dislocation and complex special situations." },
  { id: "f6",  name: "Aldgate Opportunistic Credit Fund",      managerId: "m4",  strategy: "Opportunistic Credit",           vintage: 2024, targetSize: 1200, hardCap: 1500, raised: 1500, status: "Final Close",    domicile: "Ireland",    geoFocus: "Pan-European",       sectorFocus: "Diversified",            description: "Oversubscribed opportunistic credit vehicle closed at its €1.5bn hard cap." },
  { id: "f7",  name: "Lumière Private Debt Fund IV",           managerId: "m5",  strategy: "Senior Direct Lending",          vintage: 2025, targetSize: 3000, hardCap: 3500, raised: 1750, status: "First Close",    domicile: "Luxembourg", geoFocus: "France & Benelux",   sectorFocus: "Diversified",            description: "Flagship French private debt strategy targeting €3bn with a €1.75bn first close achieved." },
  { id: "f8",  name: "Lumière Real Estate Debt II",            managerId: "m5",  strategy: "Real Estate Debt",               vintage: 2025, targetSize: 1600, hardCap: 2000, raised: 700,  status: "Open",          domicile: "Luxembourg", geoFocus: "France & Benelux",   sectorFocus: "Commercial Real Estate", description: "Whole-loan and senior CRE lending across core French and Benelux markets." },
  { id: "f9",  name: "Nordlys Direct Lending Fund II",         managerId: "m6",  strategy: "Senior Direct Lending",          vintage: 2025, targetSize: 1000, hardCap: 1300, raised: 420,  status: "Open",          domicile: "Luxembourg", geoFocus: "Nordics",            sectorFocus: "Diversified",            description: "Nordic mid-market senior lending fund; second vintage now in market." },
  { id: "f10", name: "Castellano ABL Fund I",                  managerId: "m7",  strategy: "Asset-Based Lending",            vintage: 2025, targetSize: 800,  hardCap: 1000, raised: 260,  status: "Open",          domicile: "Luxembourg", geoFocus: "Southern Europe",    sectorFocus: "SME / Receivables",     description: "Debut asset-based lending fund targeting Italian and Iberian SME collateralised credit." },
  { id: "f11", name: "Kingsmoor Infrastructure Debt III",      managerId: "m8",  strategy: "Infrastructure Debt",            vintage: 2025, targetSize: 4000, hardCap: 5000, raised: 3200, status: "Open",          domicile: "Luxembourg", geoFocus: "Pan-European",       sectorFocus: "Energy Transition & Digital", description: "Investment-grade and sub-IG infrastructure debt across energy, digital and transport." },
  { id: "f12", name: "Kingsmoor Junior Infra Credit",          managerId: "m8",  strategy: "Infrastructure Debt",            vintage: 2024, targetSize: 1500, hardCap: 1800, raised: 1800, status: "Final Close",    domicile: "Luxembourg", geoFocus: "Pan-European",       sectorFocus: "Infrastructure",        description: "Higher-yielding junior infrastructure debt sleeve closed at hard cap." },
  { id: "f13", name: "Brandt & Holm Mezzanine Fund VI",        managerId: "m9",  strategy: "Mezzanine / Junior Debt",        vintage: 2025, targetSize: 2000, hardCap: 2400, raised: 1100, status: "First Close",    domicile: "Luxembourg", geoFocus: "DACH",               sectorFocus: "Mittelstand",           description: "Sixth-vintage Mittelstand mezzanine and junior capital fund." },
  { id: "f14", name: "Sefton European CLO 2025-1",             managerId: "m10", strategy: "Structured Credit / CLO",        vintage: 2025, targetSize: 450,  hardCap: 500,  raised: 450,  status: "Final Close",    domicile: "Ireland",    geoFocus: "Pan-European",       sectorFocus: "Broadly Syndicated Loans", description: "New-issue European CLO priced and closed at €450m." },
  { id: "f15", name: "Sefton Structured Credit Opportunities", managerId: "m10", strategy: "Structured Credit / CLO",        vintage: 2025, targetSize: 1500, hardCap: 2000, raised: 880,  status: "Open",          domicile: "Ireland",    geoFocus: "Pan-European",       sectorFocus: "CLO Equity & Mezz",     description: "Open-ended style commingled fund investing in CLO tranches and structured credit." },
  { id: "f16", name: "Atlas Iberia Real Estate Credit I",      managerId: "m11", strategy: "Real Estate Debt",               vintage: 2025, targetSize: 600,  hardCap: 750,  raised: 180,  status: "Open",          domicile: "Luxembourg", geoFocus: "Southern Europe",    sectorFocus: "Commercial Real Estate", description: "Debut Iberian CRE credit fund focused on Spain and Portugal." },
  { id: "f17", name: "Greenfield NAV Finance Fund II",         managerId: "m12", strategy: "NAV / Fund Finance",             vintage: 2025, targetSize: 2500, hardCap: 3000, raised: 1400, status: "First Close",    domicile: "Luxembourg", geoFocus: "Pan-European",       sectorFocus: "Fund Finance",          description: "NAV lending to European PE and credit sponsors; €1.4bn first close." },
  { id: "f18", name: "Roosevelt Mezzanine Europe IV",          managerId: "m13", strategy: "Mezzanine / Junior Debt",        vintage: 2025, targetSize: 1800, hardCap: 2200, raised: 760,  status: "Open",          domicile: "Luxembourg", geoFocus: "Pan-European",       sectorFocus: "Diversified",            description: "Pan-European junior capital fund offering mezzanine, PIK and preferred equity." },
  { id: "f19", name: "Caledonia Lower Mid-Market Fund III",    managerId: "m14", strategy: "Senior Direct Lending",          vintage: 2025, targetSize: 900,  hardCap: 1100, raised: 510,  status: "Open",          domicile: "Luxembourg", geoFocus: "UK & Ireland",       sectorFocus: "Diversified",            description: "UK & Ireland lower-mid-market senior lending; third vintage." },
  { id: "f20", name: "Thornbury Credit Opportunities",         managerId: "m1",  strategy: "Opportunistic Credit",           vintage: 2026, targetSize: 2000, hardCap: 2500, raised: 0,    status: "Pre-marketing", domicile: "Luxembourg", geoFocus: "Pan-European",       sectorFocus: "Diversified",            description: "New opportunistic credit strategy in pre-marketing; first close expected H2 2026." },
  { id: "f21", name: "Vandermeer Mezzanine Partners",          managerId: "m2",  strategy: "Mezzanine / Junior Debt",        vintage: 2026, targetSize: 1000, hardCap: 1300, raised: 0,    status: "Pre-marketing", domicile: "Luxembourg", geoFocus: "France & Benelux",   sectorFocus: "Diversified",            description: "Debut dedicated mezzanine fund currently being pre-marketed to anchor investors." },
  { id: "f22", name: "Helvetia Infrastructure Senior Debt",    managerId: "m3",  strategy: "Infrastructure Debt",            vintage: 2025, targetSize: 1200, hardCap: 1500, raised: 540,  status: "Open",          domicile: "Luxembourg", geoFocus: "DACH",               sectorFocus: "Energy & Utilities",    description: "Senior infrastructure debt fund focused on DACH energy and utilities." },
  { id: "f23", name: "Nordlys Special Opportunities",          managerId: "m6",  strategy: "Opportunistic Credit",           vintage: 2025, targetSize: 700,  hardCap: 900,  raised: 230,  status: "Open",          domicile: "Luxembourg", geoFocus: "Nordics",            sectorFocus: "Diversified",            description: "Opportunistic Nordic credit fund pursuing dislocations and bilateral situations." },
  { id: "f24", name: "Castellano Opportunistic Credit II",     managerId: "m7",  strategy: "Opportunistic Credit",           vintage: 2024, targetSize: 1000, hardCap: 1200, raised: 1200, status: "Final Close",    domicile: "Luxembourg", geoFocus: "Southern Europe",    sectorFocus: "Diversified",            description: "Closed at hard cap; pursued Southern European corporate and asset-backed dislocations." },
];

// ---------------------------------------------------------------------------
// LP / Allocator profiles — aum in € billions, typicalTicket in € millions
// ---------------------------------------------------------------------------
export const lps = [
  { id: "l1",  name: "Rhinevale Pension Trust",          type: "Corporate Pension",        hq: "Munich, DE",     aum: 62,  pcAllocationPct: 9,  typicalTicket: 75,  strategies: ["Senior Direct Lending","Infrastructure Debt"],            mandateStatus: "Actively allocating", notes: "Building out private credit sleeve; prefers established DACH and pan-European managers." },
  { id: "l2",  name: "Caledonian Local Government Scheme",type: "Public Pension",          hq: "Glasgow, UK",    aum: 48,  pcAllocationPct: 7,  typicalTicket: 50,  strategies: ["Senior Direct Lending","Real Estate Debt"],               mandateStatus: "Actively allocating", notes: "Open RFP for European private debt; ESG screening required." },
  { id: "l3",  name: "Helios Insurance Group",            type: "Insurance",               hq: "Paris, FR",      aum: 140, pcAllocationPct: 6,  typicalTicket: 120, strategies: ["Senior Direct Lending","Infrastructure Debt","Structured Credit / CLO"], mandateStatus: "Selective",          notes: "Solvency II-sensitive; favours investment-grade infra debt and rated structures." },
  { id: "l4",  name: "Nordic Sovereign Reserve",          type: "Sovereign Wealth Fund",   hq: "Oslo, NO",       aum: 310, pcAllocationPct: 4,  typicalTicket: 250, strategies: ["Senior Direct Lending","Opportunistic Credit","Infrastructure Debt"], mandateStatus: "Actively allocating", notes: "Large-ticket anchor investor; seeks co-investment rights and fee concessions." },
  { id: "l5",  name: "Greywell Fund of Funds",            type: "Fund of Funds",           hq: "London, UK",     aum: 22,  pcAllocationPct: 35, typicalTicket: 40,  strategies: ["Unitranche","Mezzanine / Junior Debt","Opportunistic Credit"], mandateStatus: "Actively allocating", notes: "Specialist private credit FoF; backs emerging and mid-sized managers." },
  { id: "l6",  name: "Van Oss Family Office",             type: "Family Office",           hq: "Amsterdam, NL",  aum: 5,   pcAllocationPct: 18, typicalTicket: 15,  strategies: ["Unitranche","Mezzanine / Junior Debt","Real Estate Debt"], mandateStatus: "Selective",          notes: "Flexible mandate; values manager access and bespoke structures." },
  { id: "l7",  name: "St. Brigid's University Endowment", type: "Endowment / Foundation",  hq: "Dublin, IE",     aum: 8,   pcAllocationPct: 12, typicalTicket: 20,  strategies: ["Senior Direct Lending","Opportunistic Credit"],           mandateStatus: "Selective",          notes: "Long-term horizon; prefers managers with strong downside protection record." },
  { id: "l8",  name: "Banca Lombarda Treasury",           type: "Bank / Treasury",         hq: "Milan, IT",      aum: 90,  pcAllocationPct: 3,  typicalTicket: 60,  strategies: ["Structured Credit / CLO","Asset-Based Lending"],          mandateStatus: "Selective",          notes: "Treasury allocation to rated structured credit; Southern Europe affinity." },
  { id: "l9",  name: "Hanseatic Pensionskasse",           type: "Corporate Pension",       hq: "Hamburg, DE",    aum: 34,  pcAllocationPct: 8,  typicalTicket: 45,  strategies: ["Senior Direct Lending","Mezzanine / Junior Debt"],        mandateStatus: "Actively allocating", notes: "Re-up focused; supports DACH Mittelstand lenders." },
  { id: "l10", name: "Iberia Pensiones Mutua",            type: "Public Pension",          hq: "Madrid, ES",     aum: 26,  pcAllocationPct: 5,  typicalTicket: 35,  strategies: ["Real Estate Debt","Senior Direct Lending"],               mandateStatus: "Actively allocating", notes: "New private credit programme; Southern Europe and pan-European focus." },
  { id: "l11", name: "Sterling Mutual Insurance",         type: "Insurance",               hq: "London, UK",     aum: 175, pcAllocationPct: 7,  typicalTicket: 150, strategies: ["Senior Direct Lending","Infrastructure Debt","NAV / Fund Finance"], mandateStatus: "Actively allocating", notes: "Matching-adjustment eligible assets preferred; large tickets with SMA option." },
  { id: "l12", name: "Polar Star Pension Fund",           type: "Public Pension",          hq: "Stockholm, SE",  aum: 55,  pcAllocationPct: 6,  typicalTicket: 55,  strategies: ["Senior Direct Lending","Unitranche"],                     mandateStatus: "Selective",          notes: "Nordic home bias but increasingly pan-European; strong ESG requirements." },
  { id: "l13", name: "Montagne Family Capital",           type: "Family Office",           hq: "Geneva, CH",     aum: 6,   pcAllocationPct: 22, typicalTicket: 18,  strategies: ["Mezzanine / Junior Debt","Opportunistic Credit","Distressed & Special Situations"], mandateStatus: "Actively allocating", notes: "Higher-yield appetite; comfortable with junior and distressed risk." },
  { id: "l14", name: "Aurora Pension Partners",           type: "Corporate Pension",       hq: "Helsinki, FI",   aum: 41,  pcAllocationPct: 7,  typicalTicket: 50,  strategies: ["Senior Direct Lending","Infrastructure Debt"],            mandateStatus: "Not currently active",notes: "Fully allocated for 2026; revisiting new commitments in 2027." },
];

// ---------------------------------------------------------------------------
// Fundraising intelligence feed
// ---------------------------------------------------------------------------
export const intel = [
  { id: "i1",  date: "2026-06-10", type: "Final Close",  headline: "Thornbury closes Unitranche Opportunities II at €3bn hard cap",         managerId: "m1",  fundId: "f2",  summary: "Thornbury Capital Partners has held a final close on its second unitranche fund at the €3bn hard cap, oversubscribed versus a €2.5bn target." },
  { id: "i2",  date: "2026-06-08", type: "Mandate",      headline: "Nordic Sovereign Reserve issues €1bn European private credit mandate",  managerId: null,  fundId: null,  summary: "The sovereign wealth fund is seeking up to four managers for a new pan-European private credit allocation, with co-investment rights a stated priority." },
  { id: "i3",  date: "2026-06-05", type: "Launch",       headline: "Thornbury begins pre-marketing Credit Opportunities strategy",          managerId: "m1",  fundId: "f20", summary: "Thornbury is pre-marketing a new opportunistic credit fund targeting €2bn, with a first close expected in H2 2026." },
  { id: "i4",  date: "2026-05-28", type: "First Close",  headline: "Lumière Private Debt Fund IV holds €1.75bn first close",                managerId: "m5",  fundId: "f7",  summary: "The French manager has reached a first close on its fourth flagship vintage, more than half-way to its €3bn target." },
  { id: "i5",  date: "2026-05-22", type: "Personnel",    headline: "Aldgate hires former bank head of restructuring as Partner",            managerId: "m4",  fundId: null,  summary: "Aldgate Special Situations has appointed a senior restructuring banker to lead origination as it ramps Fund IV fundraising." },
  { id: "i6",  date: "2026-05-19", type: "First Close",  headline: "Greenfield NAV Finance Fund II reaches €1.4bn first close",             managerId: "m12", fundId: "f17", summary: "Greenfield NAV Solutions has held a first close on its second NAV financing vehicle amid strong sponsor demand for fund-level liquidity." },
  { id: "i7",  date: "2026-05-14", type: "Mandate",      headline: "Caledonian Local Government Scheme opens European private debt RFP",     managerId: null,  fundId: null,  summary: "The UK public pension is running a search for senior direct lending exposure with strict ESG screening criteria." },
  { id: "i8",  date: "2026-05-09", type: "Launch",       headline: "Atlas Iberia launches debut Iberian CRE credit fund",                  managerId: "m11", fundId: "f16", summary: "Atlas Iberia Debt has launched its first real estate credit fund targeting €600m across Spanish and Portuguese assets." },
  { id: "i9",  date: "2026-05-02", type: "Final Close",  headline: "Kingsmoor Junior Infra Credit closes at €1.8bn hard cap",               managerId: "m8",  fundId: "f12", summary: "Kingsmoor Infrastructure has closed its higher-yielding junior infrastructure sleeve at the hard cap, citing strong insurer demand." },
  { id: "i10", date: "2026-04-25", type: "First Close",  headline: "Brandt & Holm Mezzanine Fund VI holds €1.1bn first close",              managerId: "m9",  fundId: "f13", summary: "The German Mittelstand financier has reached an early first close, supported by re-upping DACH pension investors." },
  { id: "i11", date: "2026-04-18", type: "Strategy",     headline: "Helios Insurance signals tilt toward investment-grade infra debt",      managerId: null,  fundId: null,  summary: "Helios Insurance Group says Solvency II treatment is steering new private credit commitments toward rated infrastructure and structured strategies." },
  { id: "i12", date: "2026-04-11", type: "Launch",       headline: "Vandermeer to launch debut dedicated mezzanine fund",                  managerId: "m2",  fundId: "f21", summary: "Vandermeer Credit is preparing to pre-market a €1bn mezzanine strategy, extending its flexible-capital franchise." },
  { id: "i13", date: "2026-04-03", type: "First Close",  headline: "Vandermeer Flexible Credit III first close above plan at €950m",        managerId: "m2",  fundId: "f3",  summary: "The Benelux specialist held a €950m first close, ahead of internal targets for the vintage." },
  { id: "i14", date: "2026-03-27", type: "Final Close",  headline: "Castellano Opportunistic Credit II closes at €1.2bn hard cap",          managerId: "m7",  fundId: "f24", summary: "Castellano Credit has closed its second opportunistic fund at the hard cap, focused on Southern European dislocations." },
  { id: "i15", date: "2026-03-20", type: "Mandate",      headline: "Sterling Mutual Insurance seeks SMA partner for senior lending",        managerId: null,  fundId: null,  summary: "Sterling Mutual is evaluating a large separately managed account for matching-adjustment-eligible European senior direct lending." },
  { id: "i16", date: "2026-03-12", type: "Personnel",    headline: "Lumière promotes head of CRE debt to Managing Partner",                 managerId: "m5",  fundId: null,  summary: "Lumière Asset Management has elevated its real estate debt lead as it scales the second CRE credit vintage." },
  { id: "i17", date: "2026-03-05", type: "Final Close",  headline: "Sefton prices new €450m European CLO",                                 managerId: "m10", fundId: "f14", summary: "Sefton Structured Credit has priced and closed its first European CLO of 2026 at €450m." },
  { id: "i18", date: "2026-02-26", type: "Launch",       headline: "Nordlys returns to market with second direct lending fund",             managerId: "m6",  fundId: "f9",  summary: "Nordlys Kapital has launched its second Nordic mid-market direct lending fund, targeting €1bn." },
  { id: "i19", date: "2026-02-18", type: "Strategy",     headline: "Greywell FoF flags appetite for emerging European credit managers",     managerId: null,  fundId: null,  summary: "Greywell Fund of Funds says it will back two to three first-time or sub-€2bn European credit managers this year." },
  { id: "i20", date: "2026-02-10", type: "First Close",  headline: "Kingsmoor Infrastructure Debt III passes €3.2bn raised",                managerId: "m8",  fundId: "f11", summary: "Kingsmoor's third flagship infrastructure debt fund has now raised €3.2bn toward a €4bn target." },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------
export const managerById = Object.fromEntries(managers.map((m) => [m.id, m]));
export const fundById = Object.fromEntries(funds.map((f) => [f.id, f]));
export const lpById = Object.fromEntries(lps.map((l) => [l.id, l]));

export function fundsByManager(managerId) {
  return funds.filter((f) => f.managerId === managerId);
}
export function intelForManager(managerId) {
  return intel.filter((i) => i.managerId === managerId);
}
export function intelForFund(fundId) {
  return intel.filter((i) => i.fundId === fundId);
}
