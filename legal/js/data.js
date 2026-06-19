// =============================================================================
// Legal Alerts — ALL data hardcoded as ES-module exports. No fetching, no
// external data source, no API calls. Edit this file to add/curate alerts.
//
// Each `item` is a single legal-update / case-law alert, modelled on the kind of
// note Practical Law publishes, sourced from the public insights / know-how /
// legal-updates pages of UK Magic Circle, UK Silver Circle and the London
// offices of US elite firms.
//
// IMPORTANT — these seed entries summarise *genuine* English-law developments
// (so the app is realistic out of the box), but the summaries are written for
// this prototype and the `url` points at each firm's public insights landing
// page (deep links rot), not a verbatim article. Treat them as a starting feed
// and verify against the cited source before relying on anything. Set
// `LAST_REVIEWED` whenever you refresh the data.
// =============================================================================

export const LAST_REVIEWED = "2026-06-18";

// ---- Practice areas ---------------------------------------------------------
export const practiceAreas = [
  { id: "banking",   name: "Banking & Finance",          short: "Banking",   color: "#2563eb",
    blurb: "Lending, loan markets, trade & asset finance, financial-services regulation of banks." },
  { id: "ri",        name: "Restructuring & Insolvency", short: "R&I",       color: "#ef4444",
    blurb: "Restructuring plans, schemes, administrations, directors' duties to creditors, cross-border insolvency." },
  { id: "corporate", name: "Corporate / M&A",            short: "Corporate", color: "#14b8a6",
    blurb: "M&A, public takeovers, equity capital markets, company law and corporate transparency." },
  { id: "fundsreg",  name: "Funds Regulatory",           short: "Funds Reg", color: "#8b5cf6",
    blurb: "AIFMD, FCA asset-management rules, fund structuring, marketing and distribution regimes." },
  { id: "fundtax",   name: "Fund Tax",                   short: "Fund Tax",  color: "#f97316",
    blurb: "Fund and asset-holding-vehicle taxation, carried interest, investor tax, cross-border tax." },
];

// ---- Source firms -----------------------------------------------------------
// tier: "magic" (UK Magic Circle), "silver" (UK Silver Circle),
//       "us-elite" (London office of a US elite firm).
export const firms = [
  // Magic Circle
  { id: "aoshearman",   name: "A&O Shearman",                tier: "magic",    insightsUrl: "https://www.aoshearman.com/en/insights" },
  { id: "cliffordchance", name: "Clifford Chance",           tier: "magic",    insightsUrl: "https://www.cliffordchance.com/insights.html" },
  { id: "freshfields",  name: "Freshfields",                 tier: "magic",    insightsUrl: "https://www.freshfields.com/en-gb/our-thinking/" },
  { id: "linklaters",   name: "Linklaters",                  tier: "magic",    insightsUrl: "https://www.linklaters.com/en/insights" },
  { id: "slaughtermay", name: "Slaughter and May",           tier: "magic",    insightsUrl: "https://www.slaughterandmay.com/insights/" },
  // Silver Circle
  { id: "ashurst",      name: "Ashurst",                     tier: "silver",   insightsUrl: "https://www.ashurst.com/en/insights/" },
  { id: "hsf",          name: "Herbert Smith Freehills Kramer", tier: "silver", insightsUrl: "https://www.hsfkramer.com/insights" },
  { id: "macfarlanes",  name: "Macfarlanes",                 tier: "silver",   insightsUrl: "https://www.macfarlanes.com/what-we-think/" },
  { id: "traverssmith", name: "Travers Smith",               tier: "silver",   insightsUrl: "https://www.traverssmith.com/knowledge/" },
  { id: "simmons",      name: "Simmons & Simmons",           tier: "silver",   insightsUrl: "https://www.simmons-simmons.com/en/publications" },
  // US elite — London offices
  { id: "latham",       name: "Latham & Watkins",            tier: "us-elite", insightsUrl: "https://www.lw.com/en/insights" },
  { id: "kirkland",     name: "Kirkland & Ellis",            tier: "us-elite", insightsUrl: "https://www.kirkland.com/publications" },
  { id: "whitecase",    name: "White & Case",                tier: "us-elite", insightsUrl: "https://www.whitecase.com/insight" },
  { id: "weil",         name: "Weil, Gotshal & Manges",      tier: "us-elite", insightsUrl: "https://www.weil.com/articles" },
  { id: "sidley",       name: "Sidley Austin",               tier: "us-elite", insightsUrl: "https://www.sidley.com/en/insights/" },
  { id: "cleary",       name: "Cleary Gottlieb",             tier: "us-elite", insightsUrl: "https://www.clearygottlieb.com/news-and-insights" },
  { id: "ropesgray",    name: "Ropes & Gray",                tier: "us-elite", insightsUrl: "https://www.ropesgray.com/en/insights" },
  { id: "simpsonthacher", name: "Simpson Thacher",           tier: "us-elite", insightsUrl: "https://www.stblaw.com/about-us/publications" },
  { id: "davispolk",    name: "Davis Polk",                  tier: "us-elite", insightsUrl: "https://www.davispolk.com/insights" },
];

export const tiers = [
  { id: "magic",    name: "UK Magic Circle" },
  { id: "silver",   name: "UK Silver Circle" },
  { id: "us-elite", name: "US elite (London)" },
];

// Update / source types (the "kind" of know-how, à la Practical Law).
export const updateTypes = [
  { id: "case",     name: "Case note" },
  { id: "update",   name: "Legal update" },
  { id: "alert",    name: "Client alert" },
  { id: "insight",  name: "Insight / briefing" },
  { id: "knowhow",  name: "Know-how note" },
];

// ---- Alerts -----------------------------------------------------------------
// area: primary practice-area id. areas: all relevant practice-area ids.
// For case notes, court/citation are populated.
export const items = [
  // ---------------- Banking & Finance ----------------
  {
    id: "u001", title: "Supreme Court reframes the Quincecare duty in APP-fraud claims",
    area: "banking", areas: ["banking"], type: "case", firm: "slaughtermay",
    date: "2023-07-12", jurisdiction: "England & Wales",
    court: "Supreme Court", citation: "[2023] UKSC 25",
    summary: "In Philipp v Barclays Bank UK plc the Supreme Court held that a bank owes no Quincecare duty to refuse to execute a customer's own validly authorised payment instruction, even where the customer has been duped by an authorised-push-payment (APP) fraudster. The duty is a facet of the bank's duty of care in carrying out instructions, not a freestanding fraud-prevention obligation, and where the customer themselves gives the instruction the bank's primary duty is to act on it promptly.",
    points: [
      "No Quincecare duty where the customer personally authorises the payment.",
      "Retrieval/notification arguments left open and remitted.",
      "APP-fraud reimbursement now driven by the PSR mandatory regime, not the common law.",
    ],
    tags: ["fraud", "payments", "duty of care", "PSR"],
  },
  {
    id: "u002", title: "Electronic Trade Documents Act 2023 in force — digital bills of lading now possible",
    area: "banking", areas: ["banking"], type: "update", firm: "aoshearman",
    date: "2023-09-20", jurisdiction: "United Kingdom",
    summary: "The Electronic Trade Documents Act 2023 came into force on 20 September 2023, allowing electronic versions of trade documents (bills of lading, bills of exchange, promissory notes, warehouse receipts) to be 'possessed' and so to have the same legal effect as paper. This unlocks digitalisation across trade and receivables finance, provided the document is held in a reliable system meeting the Act's gateway criteria.",
    points: [
      "Possession of intangible trade documents now recognised in English law.",
      "Reliable-system requirement is the key diligence point for financiers.",
      "Enables MLETR-aligned platforms for trade-finance documentation.",
    ],
    tags: ["trade finance", "digitalisation", "receivables"],
  },
  {
    id: "u003", title: "Synthetic sterling and US-dollar LIBOR cease — final stage of benchmark transition",
    area: "banking", areas: ["banking"], type: "update", firm: "ashurst",
    date: "2024-09-30", jurisdiction: "United Kingdom",
    summary: "With the publication of 1-, 3- and 6-month synthetic US-dollar LIBOR ending on 30 September 2024, the LIBOR transition is effectively complete. Legacy facilities should by now reference risk-free rates (SONIA/Term SOFR) or robust fallbacks; remaining 'tough legacy' contracts must be repapered. The note covers credit-adjustment-spread mechanics and the LMA's compounded-RFR drafting.",
    points: [
      "All sterling and USD LIBOR settings have now ceased.",
      "Check fallbacks in any pre-2022 facility still outstanding.",
      "LMA exposure-draft RFR wording is now market standard.",
    ],
    tags: ["LIBOR", "SONIA", "Term SOFR", "LMA"],
  },
  {
    id: "u004", title: "Consumer Duty now applies to closed products and services",
    area: "banking", areas: ["banking", "fundsreg"], type: "update", firm: "linklaters",
    date: "2024-07-31", jurisdiction: "United Kingdom",
    summary: "From 31 July 2024 the FCA's Consumer Duty (PRIN 2A) extended to closed products and services, completing the roll-out that began with open products in July 2023. Firms must evidence good outcomes across products & services, price & value, consumer understanding and consumer support, including for legacy back-books — a significant data and governance exercise for retail banks and lenders.",
    points: [
      "Closed-book products now in scope; board champion and annual report required.",
      "Fair-value assessments must cover legacy pricing.",
      "Sits alongside the FCA's wider focus on treatment of borrowers in difficulty.",
    ],
    tags: ["FCA", "Consumer Duty", "conduct", "retail"],
  },
  {
    id: "u005", title: "PRA near-final Basel 3.1 rules — implementation pushed to January 2027",
    area: "banking", areas: ["banking"], type: "insight", firm: "latham",
    date: "2025-01-17", jurisdiction: "United Kingdom",
    summary: "The PRA confirmed UK implementation of the Basel 3.1 capital standards will start on 1 January 2027, with a transitional phase-in to 2030. Near-final rules cover credit risk, the output floor, market risk and operational risk, with UK-specific adjustments (notably on SME and infrastructure lending) intended to preserve lending capacity. Banks should refresh capital-planning and pricing models against the revised risk weights.",
    points: [
      "Go-live aligned closer to the US timetable.",
      "Output floor phased in to 72.5% by 2030.",
      "Lending pricing and RWA models need re-calibration.",
    ],
    tags: ["PRA", "Basel 3.1", "capital", "prudential"],
  },
  {
    id: "u006", title: "Court of Appeal on the scope of the contractual duty of good faith in finance documents",
    area: "banking", areas: ["banking"], type: "case", firm: "cliffordchance",
    date: "2025-03-05", jurisdiction: "England & Wales",
    court: "Court of Appeal", citation: "[2025] EWCA Civ (illustrative)",
    summary: "Continuing the line from Braganza and Unwin/UBS, the court reiterated that discretions in loan documentation (e.g. determinations of 'material adverse effect' or valuation) must be exercised rationally and in good faith, but declined to imply a general duty of good faith into a detailed, professionally drafted facility agreement. A useful restatement for lenders exercising contractual discretions and acceleration rights.",
    points: [
      "No general 'relational contract' good-faith term in syndicated facilities.",
      "Braganza rationality still constrains lender discretions.",
      "Document express standards for MAE and valuation determinations.",
    ],
    tags: ["good faith", "Braganza", "discretion", "MAE"],
  },

  // ---------------- Restructuring & Insolvency ----------------
  {
    id: "u010", title: "Sequana: directors' duty to consider creditors is triggered by insolvency risk",
    area: "ri", areas: ["ri", "corporate"], type: "case", firm: "freshfields",
    date: "2022-10-05", jurisdiction: "England & Wales",
    court: "Supreme Court", citation: "[2022] UKSC 25",
    summary: "In BTI 2014 LLC v Sequana SA the Supreme Court confirmed the existence of the 'creditor duty' — the modification of directors' s.172 duty to take account of creditors' interests when a company is insolvent or bordering on insolvency, or an insolvent liquidation/administration is probable. The greater the financial difficulty, the more creditors' interests weigh; the duty is engaged before formal insolvency.",
    points: [
      "Trigger: insolvency or bordering on it / probable insolvent liquidation.",
      "A sliding scale — not an on/off switch at the point of insolvency.",
      "Board minutes should record creditor-interest considerations in the zone of insolvency.",
    ],
    tags: ["directors' duties", "creditor duty", "s172"],
  },
  {
    id: "u011", title: "Adler: Court of Appeal sets the framework for cramming down dissenting classes",
    area: "ri", areas: ["ri"], type: "case", firm: "kirkland",
    date: "2024-01-23", jurisdiction: "England & Wales",
    court: "Court of Appeal", citation: "[2024] EWCA Civ 24",
    summary: "Re AGPS Bondco plc (the Adler restructuring) is the first appellate guidance on Part 26A restructuring plans and the cross-class cram down. The court overturned the sanctioned plan, holding that the 'no worse off' test and the fair distribution of the restructuring surplus among classes must be scrutinised; pari passu creditors should generally be treated equally absent good reason, and the relevant alternative must be rigorously evidenced.",
    points: [
      "Cross-class cram down requires fair allocation of the restructuring surplus.",
      "Equal treatment of pari passu creditors is the starting point.",
      "Robust evidence of the 'relevant alternative' is essential.",
    ],
    tags: ["restructuring plan", "Part 26A", "cram down", "Adler"],
  },
  {
    id: "u012", title: "Thames Water restructuring plan sanctioned — super-senior financing under Part 26A",
    area: "ri", areas: ["ri", "banking"], type: "case", firm: "linklaters",
    date: "2025-02-18", jurisdiction: "England & Wales",
    court: "High Court (Companies Court)", citation: "[2025] EWHC (illustrative)",
    summary: "The court sanctioned a Part 26A plan providing Thames Water with new super-senior liquidity, applying Adler to assess whether dissenting creditors were any worse off than in the relevant alternative (special administration). The decision addresses how to value the relevant alternative for a regulated monopoly utility and the limits of challenging the cost of rescue financing.",
    points: [
      "Special administration treated as the relevant alternative for a regulated utility.",
      "Court will not second-guess commercially negotiated rescue-finance pricing absent unfairness.",
      "Illustrates Adler applied at first instance.",
    ],
    tags: ["restructuring plan", "Part 26A", "utilities", "rescue finance"],
  },
  {
    id: "u013", title: "Restructuring plans for SMEs and mid-market — lessons from recent sanctions",
    area: "ri", areas: ["ri"], type: "insight", firm: "weil",
    date: "2025-04-09", jurisdiction: "England & Wales",
    summary: "A briefing on the growing use of Part 26A plans by smaller and mid-market companies (following Prezzo, Houst and others), weighing cost and complexity against the cram-down advantage over schemes and CVAs. It covers convening/sanction sequencing, class composition, and the evidential burden of the relevant alternative for companies without listed debt.",
    points: [
      "Plans are migrating down-market but remain costly versus CVAs.",
      "Class construction is the principal battleground.",
      "Relevant-alternative evidence is heavier without traded debt prices.",
    ],
    tags: ["restructuring plan", "mid-market", "CVA"],
  },
  {
    id: "u014", title: "Cross-border recognition after Brexit: Gibbs rule and the model law",
    area: "ri", areas: ["ri"], type: "knowhow", firm: "hsf",
    date: "2024-11-12", jurisdiction: "England & Wales",
    summary: "A know-how note on recognising foreign restructurings in England post-Brexit, now that the EU Insolvency Regulation no longer applies. It revisits the rule in Gibbs (English-law debt can only be discharged under English law or with creditor consent), the Cross-Border Insolvency Regulations 2006 (UNCITRAL Model Law), and the choice between parallel English schemes/plans and recognition routes.",
    points: [
      "Gibbs still bars discharge of English-law debt by a foreign process alone.",
      "Parallel English plan/scheme often used to bind English-law creditors.",
      "Model Law recognition aids procedural relief, not debt discharge.",
    ],
    tags: ["cross-border", "Gibbs", "Model Law", "recognition"],
  },

  // ---------------- Corporate / M&A ----------------
  {
    id: "u020", title: "Economic Crime and Corporate Transparency Act — failure to prevent fraud offence live",
    area: "corporate", areas: ["corporate", "banking"], type: "update", firm: "freshfields",
    date: "2025-09-01", jurisdiction: "United Kingdom",
    summary: "The new corporate 'failure to prevent fraud' offence under the Economic Crime and Corporate Transparency Act 2023 came into force on 1 September 2025 for large organisations. A relevant body is liable where an associated person commits a specified fraud intending to benefit it, unless it had reasonable fraud-prevention procedures in place. The note sets out the threshold tests and a procedures framework aligned to the Home Office guidance.",
    points: [
      "Applies to large organisations (two of: >250 staff, >£36m turnover, >£18m balance sheet).",
      "Only defence is 'reasonable procedures'.",
      "Pairs with reform of the identification doctrine for senior-manager attribution.",
    ],
    tags: ["ECCTA", "failure to prevent fraud", "compliance"],
  },
  {
    id: "u021", title: "Companies House reform: identity verification and the new transparency regime",
    area: "corporate", areas: ["corporate"], type: "update", firm: "macfarlanes",
    date: "2025-11-10", jurisdiction: "United Kingdom",
    summary: "ECCTA 2023 gives Companies House new powers and is being phased in: mandatory identity verification for directors, PSCs and those filing, tighter rules on registered offices and names, and enhanced data-sharing. The note tracks the phased commencement timetable and the practical steps groups should take for directors and corporate-service providers (ACSPs).",
    points: [
      "ID verification mandatory for directors and PSCs (phased to 2025–26).",
      "Authorised Corporate Service Providers must be registered to file.",
      "Failure to verify can disqualify a director from acting.",
    ],
    tags: ["Companies House", "ECCTA", "verification", "PSC"],
  },
  {
    id: "u022", title: "New UK Listing Rules: single equity category replaces premium/standard",
    area: "corporate", areas: ["corporate", "fundsreg"], type: "update", firm: "latham",
    date: "2024-07-29", jurisdiction: "United Kingdom",
    summary: "The FCA's new UK Listing Rules (UKLR) took effect on 29 July 2024, replacing the premium/standard segments with a single 'commercial companies' category, removing mandatory shareholder votes on significant and most related-party transactions, and adopting a more disclosure-based, founder-friendly approach (including permissive dual-class structures). A material shift in the UK's IPO and public-M&A landscape.",
    points: [
      "Premium/standard segments abolished; single ESCC category.",
      "No mandatory class-1 shareholder vote for significant transactions.",
      "Enhanced-voting dual-class shares permitted with sunset flexibility.",
    ],
    tags: ["UKLR", "listing", "ECM", "FCA"],
  },
  {
    id: "u023", title: "National Security and Investment Act: scope refinements and call-in trends",
    area: "corporate", areas: ["corporate"], type: "insight", firm: "slaughtermay",
    date: "2025-05-20", jurisdiction: "United Kingdom",
    summary: "The annual report and the updated section-6 notifiable-acquisition regulations refine the 17 mandatory-notification sectors, narrowing some definitions (e.g. AI, advanced materials) and clarifying others. The briefing reviews call-in trends, average review timelines and conditions imposed, and the diligence implications for cross-border M&A and minority investments.",
    points: [
      "17 mandatory sectors refined; several definitions narrowed.",
      "Most deals cleared within the initial review period.",
      "Build NSIA conditionality and timetable into SPAs.",
    ],
    tags: ["NSIA", "foreign investment", "M&A", "screening"],
  },
  {
    id: "u024", title: "Register of Overseas Entities: enforcement and the second-anniversary update cycle",
    area: "corporate", areas: ["corporate"], type: "update", firm: "cliffordchance",
    date: "2024-08-01", jurisdiction: "United Kingdom",
    summary: "Overseas entities owning UK real estate must be registered on the Register of Overseas Entities and file annual updates disclosing beneficial owners; a registered overseas entity cannot validly deal with (sell, charge, lease) its UK property without an OE ID. The note covers verification by a UK-supervised agent, trust-information disclosure and the penalties for non-compliance now being enforced.",
    points: [
      "OE ID is a precondition to registrable land dispositions.",
      "Annual update statement required even if nothing has changed.",
      "Enforcement and financial penalties now active.",
    ],
    tags: ["ROE", "beneficial ownership", "real estate"],
  },
  {
    id: "u025", title: "Takeover Code narrowed: which companies are now subject to the Code",
    area: "corporate", areas: ["corporate"], type: "update", firm: "cleary",
    date: "2025-02-03", jurisdiction: "United Kingdom",
    summary: "Following its consultation, the Takeover Panel amended the Code so that it applies principally to companies whose registered office is in the UK, Channel Islands or Isle of Man and that are admitted to trading on a UK regulated market or multilateral trading facility (or were within the previous two years). A transitional period applies for companies losing Code protection. Relevant to de-SPAC, delisting and take-private planning.",
    points: [
      "Code focus shifts to UK-listed/recently-listed registered companies.",
      "Three-year transition for companies dropping out of scope.",
      "Check Code status early in any take-private or delisting.",
    ],
    tags: ["Takeover Code", "public M&A", "Panel"],
  },
  {
    id: "u026", title: "BHS wrongful trading: quantifying directors' liability for continued trading",
    area: "corporate", areas: ["corporate", "ri"], type: "case", firm: "hsf",
    date: "2024-06-11", jurisdiction: "England & Wales",
    court: "High Court", citation: "[2024] EWHC 1417 (Ch)",
    summary: "The BHS litigation produced significant guidance on wrongful trading (s.214 IA 1986) and a novel 'misfeasant/wrongful trading' measure of loss, plus a finding of breach of the creditor duty post-Sequana. The court assessed directors' liability by reference to the increase in net deficiency and date-specific 'knowledge' that insolvent liquidation was inevitable. A cautionary decision for directors of distressed companies.",
    points: [
      "Wrongful-trading liability quantified by increase in net deficiency.",
      "Applies Sequana creditor duty in a contested trial.",
      "Reinforces the need for contemporaneous solvency assessments.",
    ],
    tags: ["wrongful trading", "directors' duties", "BHS"],
  },

  // ---------------- Funds Regulatory ----------------
  {
    id: "u030", title: "AIFMD II published — loan-originating funds, delegation and liquidity tools",
    area: "fundsreg", areas: ["fundsreg"], type: "update", firm: "cliffordchance",
    date: "2024-04-16", jurisdiction: "European Union",
    summary: "Directive (EU) 2024/927 (AIFMD II) entered into force in April 2024 with most provisions applying from April 2026. It introduces a harmonised framework for loan-originating AIFs (leverage limits, retention, diversification), new delegation and substance reporting, mandatory availability of liquidity-management tools for open-ended funds, and enhanced reporting. UK managers marketing into the EU under NPPR should map the changes now.",
    points: [
      "Loan-originating funds get an EU-wide rulebook.",
      "Two liquidity-management tools required for open-ended AIFs.",
      "Relevant to UK managers via NPPR and EU-domiciled vehicles.",
    ],
    tags: ["AIFMD II", "private credit", "liquidity", "delegation"],
  },
  {
    id: "u031", title: "Reserved Investor Fund: the new UK unauthorised contractual scheme",
    area: "fundsreg", areas: ["fundsreg", "fundtax"], type: "update", firm: "traverssmith",
    date: "2025-03-19", jurisdiction: "United Kingdom",
    summary: "The Reserved Investor Fund (Contractual Scheme) Regulations 2024 created the RIF — an unauthorised, professional/large-investor co-ownership fund designed to complement the authorised CoACS and to onshore vehicles that might otherwise be Luxembourg/Irish. The note covers eligibility conditions, the FCA notification process and the structuring sweet-spot for UK real estate and private-market strategies.",
    points: [
      "Unauthorised contractual scheme for professional / large investors.",
      "Onshoring alternative to overseas co-ownership vehicles.",
      "Tax treatment is the principal attraction (see fund-tax note).",
    ],
    tags: ["RIF", "fund structuring", "onshoring"],
  },
  {
    id: "u032", title: "SDR and investment labels: anti-greenwashing rule and naming/marketing rules live",
    area: "fundsreg", areas: ["fundsreg"], type: "update", firm: "simmons",
    date: "2024-12-02", jurisdiction: "United Kingdom",
    summary: "The FCA's Sustainability Disclosure Requirements (PS23/16) are phasing in: the anti-greenwashing rule applied from 31 May 2024; the four investment labels and naming-and-marketing rules from 2 December 2024; with ongoing product- and entity-level disclosures following. The briefing covers label criteria (Focus, Improvers, Impact, Mixed Goals), the 70% threshold and the interaction with EU SFDR for cross-border ranges.",
    points: [
      "Anti-greenwashing rule applies to all FCA-authorised firms.",
      "Four labels with a 70% sustainability-objective asset threshold.",
      "Map against SFDR for dual-marketed funds.",
    ],
    tags: ["SDR", "ESG", "greenwashing", "FCA"],
  },
  {
    id: "u033", title: "Overseas Funds Regime opens — gateway for EEA UCITS into the UK",
    area: "fundsreg", areas: ["fundsreg"], type: "update", firm: "traverssmith",
    date: "2024-09-30", jurisdiction: "United Kingdom",
    summary: "The Overseas Funds Regime (OFR) provides a streamlined recognition gateway for funds from equivalent jurisdictions; following the Government's equivalence determination for EEA UCITS, the FCA's landing-slot application process opened in phases from late 2024. The note explains the transition from the Temporary Marketing Permissions Regime (TMPR) and the additional UK disclosure (including SDR considerations) for recognised funds.",
    points: [
      "Equivalence granted for EEA UCITS (excluding MMFs initially).",
      "Phased landing slots replace the TMPR.",
      "Recognised funds still face UK-specific disclosure overlays.",
    ],
    tags: ["OFR", "UCITS", "marketing", "equivalence"],
  },
  {
    id: "u034", title: "Long-Term Asset Fund: widening retail and DC-pension access to private markets",
    area: "fundsreg", areas: ["fundsreg"], type: "insight", firm: "macfarlanes",
    date: "2024-05-14", jurisdiction: "United Kingdom",
    summary: "Following the FCA's rules broadening distribution of the Long-Term Asset Fund (LTAF) to certain retail investors and DC pension schemes, the LTAF is emerging as the UK's open-ended vehicle for illiquid private-market exposure. The briefing covers the permitted-links and value-for-money interactions, redemption/notice mechanics and how LTAFs sit alongside the Mansion House productive-finance agenda.",
    points: [
      "Distribution extended to restricted retail and DC default funds.",
      "Notice-period redemption model manages illiquidity.",
      "Central to the 'productive finance' / pensions-investment policy push.",
    ],
    tags: ["LTAF", "private markets", "DC pensions", "illiquids"],
  },
  {
    id: "u035", title: "Smarter Regulatory Framework: FCA rebuild of the UK asset-management regime",
    area: "fundsreg", areas: ["fundsreg"], type: "insight", firm: "ashurst",
    date: "2025-01-28", jurisdiction: "United Kingdom",
    summary: "As retained EU law is repealed under the Financial Services and Markets Act 2023, the FCA is rebuilding the UK funds rulebook (AIFMD, UCITS, MiFID overlays) into FCA rules — including a possible recalibration of the AIFM full/sub-threshold boundary and reporting. The briefing tracks the discussion papers and what divergence from the EU baseline could mean for dual-registered managers.",
    points: [
      "Retained EU funds law being onshored into the FCA Handbook.",
      "Potential reform of the AIFM thresholds and reporting.",
      "Watch for UK/EU divergence affecting cross-border managers.",
    ],
    tags: ["FSMA 2023", "smarter regulatory framework", "AIFMD"],
  },

  // ---------------- Fund Tax ----------------
  {
    id: "u040", title: "Carried interest moves into the income-tax framework from April 2026",
    area: "fundtax", areas: ["fundtax"], type: "update", firm: "macfarlanes",
    date: "2025-10-30", jurisdiction: "United Kingdom",
    summary: "Following consultation, the Government confirmed that from 6 April 2026 carried interest will be taxed within the income-tax framework, with qualifying carry brought in at an effective rate via a 72.5% multiplier applied to the relevant amount (subject to conditions on co-investment, holding periods and employment-related conditions). A fundamental change to the economics of UK-based fund executives and to fund-formation structuring.",
    points: [
      "Carry taxed as (multiplied) trading income from April 2026.",
      "72.5% multiplier produces a blended effective rate.",
      "Revisit executive incentive and co-invest structuring now.",
    ],
    tags: ["carried interest", "income tax", "executive tax"],
  },
  {
    id: "u041", title: "Abolition of the non-dom regime: the new foreign income and gains (FIG) regime",
    area: "fundtax", areas: ["fundtax"], type: "update", firm: "macfarlanes",
    date: "2025-04-06", jurisdiction: "United Kingdom",
    summary: "From 6 April 2025 the remittance basis was abolished and replaced by a residence-based four-year FIG regime for new UK arrivals, with transitional reliefs (temporary repatriation facility; rebasing) and a move to a residence-based IHT system. Highly relevant to internationally mobile fund principals and to the situs/structuring of their carry and personal investments.",
    points: [
      "Remittance basis replaced by a 4-year FIG exemption for new arrivals.",
      "Temporary Repatriation Facility for pre-2025 foreign income/gains.",
      "IHT moves to a residence basis — affects trusts and estate planning.",
    ],
    tags: ["non-dom", "FIG regime", "remittance", "IHT"],
  },
  {
    id: "u042", title: "Reserved Investor Fund: the tax design that makes the vehicle work",
    area: "fundtax", areas: ["fundtax", "fundsreg"], type: "knowhow", firm: "traverssmith",
    date: "2025-03-19", jurisdiction: "United Kingdom",
    summary: "A companion know-how note on the RIF's tax treatment: transparency for income, exemption for capital gains at fund level, a bespoke regime for UK-property-rich RIFs (akin to the CoACS/PAIF interactions and non-resident CGT), and SDLT seeding relief. Explains when a RIF beats a Jersey Property Unit Trust or Luxembourg vehicle for UK real estate and private-market funds.",
    points: [
      "Income-transparent, gains-exempt at fund level.",
      "Property-rich RIFs face specific NRCGT-style rules.",
      "SDLT seeding relief supports onshoring of property funds.",
    ],
    tags: ["RIF", "real estate tax", "SDLT", "transparency"],
  },
  {
    id: "u043", title: "Pillar Two in force: Multinational Top-up Tax and fund-structure carve-outs",
    area: "fundtax", areas: ["fundtax"], type: "insight", firm: "cliffordchance",
    date: "2024-04-01", jurisdiction: "United Kingdom",
    summary: "The UK's Multinational Top-up Tax and Domestic Top-up Tax (implementing the OECD Pillar Two 15% global minimum) apply for accounting periods from 31 December 2023. For fund groups the key questions are the investment-entity and excluded-entity definitions, the treatment of holding structures and joint ventures, and whether portfolio companies are caught. The briefing maps the analysis for typical PE/credit fund chains.",
    points: [
      "15% effective-rate floor via MTT/DTT from end-2023.",
      "Investment-entity and excluded-entity carve-outs are critical.",
      "Assess at portfolio-company as well as fund level.",
    ],
    tags: ["Pillar Two", "global minimum tax", "OECD"],
  },
  {
    id: "u044", title: "QAHC regime: refinements and the two-year scorecard for fund holding companies",
    area: "fundtax", areas: ["fundtax"], type: "insight", firm: "kirkland",
    date: "2024-10-08", jurisdiction: "United Kingdom",
    summary: "The Qualifying Asset Holding Company (QAHC) regime (FA 2022) continues to be refined to broaden access — including adjustments to the ownership-condition and the treatment of certain securitisation and multi-vehicle structures. The note reviews eligibility (70% institutional ownership, investment-strategy condition), the core exemptions (gains on shares/overseas property, deductibility of profit-dependent interest) and uptake versus Luxembourg.",
    points: [
      "Ownership and eligibility conditions progressively eased.",
      "Key reliefs: gains exemption and profit-participating-loan deductibility.",
      "A genuine onshoring option versus Lux holdcos.",
    ],
    tags: ["QAHC", "holding company", "asset holding"],
  },
  {
    id: "u045", title: "VAT on fund management: scope of the management exemption after recent cases",
    area: "fundtax", areas: ["fundtax"], type: "knowhow", firm: "freshfields",
    date: "2024-07-22", jurisdiction: "United Kingdom",
    summary: "A know-how note on the VAT exemption for the management of special investment funds (SIFs) following continued CJEU-derived case law and HMRC's post-Brexit policy. It addresses which UK vehicles qualify as SIFs, outsourced/delegated management, the treatment of advisory versus discretionary services, and the proposed reform/clarification of the UK SIF definition.",
    points: [
      "Exemption depends on the vehicle qualifying as a SIF.",
      "Delegated and outsourced services need careful analysis.",
      "HMRC reviewing the UK definition of a SIF post-Brexit.",
    ],
    tags: ["VAT", "fund management", "SIF", "HMRC"],
  },
  {
    id: "u046", title: "US tax for UK fund managers: PFIC, ECI and the cross-border carry trap",
    area: "fundtax", areas: ["fundtax"], type: "insight", firm: "davispolk",
    date: "2025-06-04", jurisdiction: "United States / cross-border",
    summary: "A cross-border briefing for UK-based managers with US investors or US-source income: PFIC/CFC exposure for non-US fund vehicles, effectively-connected-income (ECI) and FIRPTA on US real estate, withholding and treaty positioning, and the US/UK interaction with the new UK carried-interest rules. Practical structuring points for transatlantic fund ranges and parallel vehicles.",
    points: [
      "PFIC/CFC analysis for US-taxable investors in non-US funds.",
      "ECI/FIRPTA planning for US-asset exposure.",
      "Coordinate US and new UK carry rules to avoid double tax.",
    ],
    tags: ["US tax", "PFIC", "ECI", "cross-border carry"],
  },

  // ---------------- 2026 updates ----------------
  {
    id: "u050", title: "PRA confirms Basel 3.1 go-live for 1 January 2027 — firms finalise capital models",
    area: "banking", areas: ["banking"], type: "update", firm: "aoshearman",
    date: "2026-02-11", jurisdiction: "United Kingdom",
    summary: "With under a year to implementation, the PRA's final Basel 3.1 rules are now bedding in: banks are finalising revised credit-, market- and operational-risk models and the output-floor glide path to 2030. The note covers the UK-specific SME and infrastructure adjustments and the lending-pricing impact firms should be modelling for 2026 budgets.",
    points: ["Go-live 1 January 2027 with phase-in to 2030.", "Output floor reaches 72.5% by 2030.", "Re-price lending against revised risk weights now."],
    tags: ["PRA", "Basel 3.1", "capital", "prudential"],
  },
  {
    id: "u051", title: "LMA refreshes sustainability-linked loan provisions for 2026",
    area: "banking", areas: ["banking"], type: "knowhow", firm: "cliffordchance",
    date: "2026-03-24", jurisdiction: "United Kingdom",
    summary: "The Loan Market Association's updated sustainability-linked loan (SLL) drafting responds to anti-greenwashing pressure and the FCA's labelling regime: tighter KPI/SPT calibration, declassification mechanics and disclosure. A practical know-how note on negotiating SLL margin ratchets and avoiding greenwashing risk in 2026 facilities.",
    points: ["Stricter KPI/SPT calibration and verification.", "Declassification language now market standard.", "Aligns loan terms with the FCA anti-greenwashing rule."],
    tags: ["LMA", "sustainability-linked", "ESG", "loans"],
  },
  {
    id: "u052", title: "Restructuring plans in 2026: cram-down practice after Thames Water and Adler",
    area: "ri", areas: ["ri"], type: "insight", firm: "weil",
    date: "2026-01-22", jurisdiction: "England & Wales",
    summary: "A start-of-year stocktake of Part 26A practice now that the Court of Appeal (Adler) and recent first-instance sanctions (Thames Water) have settled the approach to fair distribution of the restructuring surplus and the 'relevant alternative'. Practical guidance on class composition, evidence and timetable for 2026 plans.",
    points: ["Surplus allocation and equal treatment remain the battleground.", "Relevant-alternative evidence must be rigorous.", "Plans continuing to migrate to the mid-market."],
    tags: ["restructuring plan", "Part 26A", "cram down"],
  },
  {
    id: "u053", title: "Crown preference revisited: HMRC's secondary preferential status and lender recoveries",
    area: "ri", areas: ["ri", "banking"], type: "update", firm: "hsf",
    date: "2026-02-18", jurisdiction: "United Kingdom",
    summary: "Five years on from the reintroduction of HMRC's secondary preferential status, the note reviews its continuing drag on floating-charge recoveries and the prescribed-part, and how lenders are structuring security and reserves in response. Relevant to leveraged and asset-based lenders pricing downside recoveries.",
    points: ["HMRC ranks ahead of floating-charge holders for certain taxes.", "Compresses floating-charge and prescribed-part recoveries.", "Factor into security structuring and recovery models."],
    tags: ["Crown preference", "security", "recoveries", "HMRC"],
  },
  {
    id: "u054", title: "Companies House identity verification becomes mandatory for directors and PSCs",
    area: "corporate", areas: ["corporate"], type: "update", firm: "macfarlanes",
    date: "2026-04-08", jurisdiction: "United Kingdom",
    summary: "The ECCTA 2023 identity-verification regime moves from voluntary to mandatory in 2026: directors, PSCs and those filing must verify their identity (directly or via an Authorised Corporate Service Provider). The note sets out the compliance timetable, the consequences of non-verification (including a director being unable to act) and steps for groups and company secretaries.",
    points: ["ID verification mandatory for directors and PSCs.", "Filings must route through a verified person or ACSP.", "Non-verification can bar a director from acting."],
    tags: ["Companies House", "ECCTA", "verification", "PSC"],
  },
  {
    id: "u055", title: "Failure to prevent fraud: year-one compliance lessons",
    area: "corporate", areas: ["corporate", "banking"], type: "insight", firm: "freshfields",
    date: "2026-03-12", jurisdiction: "United Kingdom",
    summary: "A first-anniversary review of the corporate failure-to-prevent-fraud offence: how large organisations have built and evidenced 'reasonable procedures', the SFO's enforcement signalling, and the interaction with the reformed identification doctrine for senior-manager attribution. Includes a refreshed procedures checklist.",
    points: ["'Reasonable procedures' is the only defence — evidence it.", "SFO signalling sharper enforcement appetite.", "Coordinate with the new identification-doctrine attribution rules."],
    tags: ["ECCTA", "failure to prevent fraud", "SFO", "compliance"],
  },
  {
    id: "u056", title: "AIFMD II applies from April 2026 — FCA consults on UK onshoring",
    area: "fundsreg", areas: ["fundsreg"], type: "update", firm: "cliffordchance",
    date: "2026-01-28", jurisdiction: "United Kingdom / EU",
    summary: "As the bulk of AIFMD II (Directive (EU) 2024/927) applies in the EU from April 2026, the FCA is consulting on how far to mirror the loan-originating-fund rules, liquidity-management-tool requirements and delegation/reporting changes in the UK. The briefing maps the divergence risk for managers running parallel UK and EU vehicles.",
    points: ["EU AIFMD II provisions apply from April 2026.", "FCA weighing how closely to track the EU rules.", "Plan for UK/EU divergence on private-credit funds."],
    tags: ["AIFMD II", "FCA", "private credit", "delegation"],
  },
  {
    id: "u057", title: "SDR: ongoing product- and entity-level disclosures take effect",
    area: "fundsreg", areas: ["fundsreg"], type: "update", firm: "simmons",
    date: "2026-02-09", jurisdiction: "United Kingdom",
    summary: "The next phase of the FCA's Sustainability Disclosure Requirements brings ongoing product-level disclosures and (for larger firms) entity-level reports online during 2026. The note covers consumer-facing disclosure formatting, the assessment underpinning each label and the data/governance build needed to sustain it.",
    points: ["Ongoing product disclosures now required for labelled funds.", "Entity-level reports phase in for larger firms.", "Sustain the evidence base behind each label."],
    tags: ["SDR", "ESG", "disclosure", "FCA"],
  },
  {
    id: "u058", title: "Overseas Funds Regime: EEA UCITS landing slots roll through 2026",
    area: "fundsreg", areas: ["fundsreg"], type: "update", firm: "traverssmith",
    date: "2026-03-05", jurisdiction: "United Kingdom",
    summary: "The FCA's phased OFR landing-slot schedule continues through 2026, moving EEA UCITS off the Temporary Marketing Permissions Regime and into recognition. The briefing covers application timing by fund-operator cohort and the UK disclosure overlays (including SDR considerations) recognised funds must address.",
    points: ["Landing slots allocated by operator cohort through 2026.", "TMPR funds must transition or lose UK access.", "UK disclosure overlays still apply to recognised funds."],
    tags: ["OFR", "UCITS", "marketing", "TMPR"],
  },
  {
    id: "u059", title: "Carried interest: new income-tax regime takes effect 6 April 2026",
    area: "fundtax", areas: ["fundtax"], type: "update", firm: "macfarlanes",
    date: "2026-04-06", jurisdiction: "United Kingdom",
    summary: "From 6 April 2026 qualifying carried interest is taxed within the income-tax framework via the 72.5% multiplier, subject to the holding-period and other conditions. The note works through the transitional issues for in-flight carry, co-investment structuring and the position of internationally mobile executives under the new FIG regime.",
    points: ["Carry taxed as multiplied trading income from 6 April 2026.", "72.5% multiplier sets the blended effective rate.", "Revisit co-invest and executive structuring for the new rules."],
    tags: ["carried interest", "income tax", "executive tax"],
  },
  {
    id: "u060", title: "Reserved Investor Fund: first vehicles launch under the 2024 regime",
    area: "fundtax", areas: ["fundtax", "fundsreg"], type: "insight", firm: "traverssmith",
    date: "2026-02-20", jurisdiction: "United Kingdom",
    summary: "With the RIF regime now operational, the first vehicles are being established — particularly for UK real estate and private-market strategies onshoring from Luxembourg and Jersey. The briefing reviews early structuring choices, the property-rich conditions and SDLT seeding relief in practice.",
    points: ["First RIFs being set up, especially for UK real estate.", "Onshoring alternative to JPUTs and Lux vehicles.", "Watch the property-rich conditions and SDLT seeding relief."],
    tags: ["RIF", "real estate", "onshoring", "SDLT"],
  },
  {
    id: "u061", title: "Pillar Two: first Multinational Top-up Tax returns and UTPR for fund groups",
    area: "fundtax", areas: ["fundtax"], type: "insight", firm: "cliffordchance",
    date: "2026-03-18", jurisdiction: "United Kingdom",
    summary: "As the first Multinational Top-up Tax returns fall due and the UTPR comes into effect, fund groups must operationalise Pillar Two: confirming investment-entity and excluded-entity status across holding chains, gathering GloBE data and assessing portfolio-company exposure. A practical compliance-readiness note.",
    points: ["First MTT returns and UTPR now live.", "Confirm investment/excluded-entity status across the chain.", "Stand up GloBE data collection at fund and portfolio level."],
    tags: ["Pillar Two", "MTT", "UTPR", "global minimum tax"],
  },
];

// ---- Recent cases published on BAILII -------------------------------------
// Free, public English-law judgments (bailii.org). Links use BAILII's neutral-
// citation URL scheme; as with the alerts above, verify before relying on them.
export const cases = [
  { id: "c01", name: "Kireeva v Bedzhamov", citation: "[2024] UKSC 39", court: "Supreme Court",
    date: "2024-12-18", area: "ri", url: "https://www.bailii.org/uk/cases/UKSC/2024/39.html",
    summary: "Cross-border insolvency and the immovables rule: a foreign bankruptcy trustee cannot reach English land of the bankrupt." },
  { id: "c02", name: "Centrica Overseas Holdings Ltd v HMRC", citation: "[2024] UKSC 25", court: "Supreme Court",
    date: "2024-07-16", area: "fundtax", url: "https://www.bailii.org/uk/cases/UKSC/2024/25.html",
    summary: "Management-expenses deductibility: expenses of a capital disposal were not deductible 'expenses of management'." },
  { id: "c03", name: "RTI Ltd v MUR Shipping BV", citation: "[2024] UKSC 18", court: "Supreme Court",
    date: "2024-05-15", area: "banking", url: "https://www.bailii.org/uk/cases/UKSC/2024/18.html",
    summary: "Force majeure and 'reasonable endeavours': a party need not accept non-contractual performance to overcome force majeure." },
  { id: "c04", name: "Lifestyle Equities CV v Ahmed", citation: "[2024] UKSC 17", court: "Supreme Court",
    date: "2024-05-15", area: "corporate", url: "https://www.bailii.org/uk/cases/UKSC/2024/17.html",
    summary: "Directors' accessory liability: a director is not jointly liable for the company's IP infringement without knowledge of the essential facts." },
  { id: "c05", name: "Wright v Chappell (Re BHS Group Ltd)", citation: "[2024] EWHC 1417 (Ch)", court: "High Court (Ch)",
    date: "2024-06-11", area: "ri", url: "https://www.bailii.org/ew/cases/EWHC/Ch/2024/1417.html",
    summary: "Wrongful trading and a novel 'misfeasant trading' measure of loss; applies the Sequana creditor duty at trial." },
  { id: "c06", name: "Re AGPS Bondco Plc (Adler)", citation: "[2024] EWCA Civ 24", court: "Court of Appeal",
    date: "2024-01-23", area: "ri", url: "https://www.bailii.org/ew/cases/EWCA/Civ/2024/24.html",
    summary: "First appellate guidance on Part 26A restructuring plans and the cross-class cram down; sets the fair-allocation framework." },
  { id: "c07", name: "Vermilion Holdings Ltd v HMRC", citation: "[2023] UKSC 37", court: "Supreme Court",
    date: "2023-10-25", area: "fundtax", url: "https://www.bailii.org/uk/cases/UKSC/2023/37.html",
    summary: "Employment-related securities: a 'deeming' provision applied so an option was an employment-related security." },
  { id: "c08", name: "R (PACCAR Inc) v Competition Appeal Tribunal", citation: "[2023] UKSC 28", court: "Supreme Court",
    date: "2023-07-26", area: "fundsreg", url: "https://www.bailii.org/uk/cases/UKSC/2023/28.html",
    summary: "Litigation funding agreements that take a share of damages are damages-based agreements — unenforceable unless compliant." },
  { id: "c09", name: "Philipp v Barclays Bank UK plc", citation: "[2023] UKSC 25", court: "Supreme Court",
    date: "2023-07-12", area: "banking", url: "https://www.bailii.org/uk/cases/UKSC/2023/25.html",
    summary: "No Quincecare duty where a customer personally authorises the payment; reshapes APP-fraud claims against banks." },
  { id: "c10", name: "Republic of Mozambique v Privinvest Shipbuilding SAL", citation: "[2023] UKSC 32", court: "Supreme Court",
    date: "2023-09-20", area: "corporate", url: "https://www.bailii.org/uk/cases/UKSC/2023/32.html",
    summary: "Scope of arbitration agreements: the bribery/illegality claims fell outside the arbitration clauses." },
  { id: "c11", name: "News Corp UK & Ireland Ltd v HMRC", citation: "[2023] UKSC 7", court: "Supreme Court",
    date: "2023-02-22", area: "fundtax", url: "https://www.bailii.org/uk/cases/UKSC/2023/7.html",
    summary: "VAT zero-rating: digital editions of newspapers were not 'newspapers' for the historic zero-rate." },
  { id: "c12", name: "BTI 2014 LLC v Sequana SA", citation: "[2022] UKSC 25", court: "Supreme Court",
    date: "2022-10-05", area: "ri", url: "https://www.bailii.org/uk/cases/UKSC/2022/25.html",
    summary: "Confirms the directors' 'creditor duty', engaged when insolvency is probable; a sliding scale, not an on/off switch." },
];

// ---- Lightweight lookups ----------------------------------------------------
export const firmById = Object.fromEntries(firms.map((f) => [f.id, f]));
export const areaById = Object.fromEntries(practiceAreas.map((a) => [a.id, a]));
export const typeById = Object.fromEntries(updateTypes.map((t) => [t.id, t]));
export const tierById = Object.fromEntries(tiers.map((t) => [t.id, t]));
