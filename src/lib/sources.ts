// Law firm, regulator and aggregator RSS/Atom feed sources.
//
// Each entry can list multiple candidate URLs. The fetcher tries them in order
// and uses the first one that returns items. This makes the app resilient to
// sources tweaking their URL paths.

export type FirmFeed = {
  firmName: string;
  feedUrls: string[];
  // If a feed mixes jurisdictions, set this so we filter to UK-relevant items.
  englandHints?: string[];
};

const UK_HINTS = ["UK", "United Kingdom", "England", "English law", "London", "FCA", "PRA", "HMRC", "HMT", "Companies Act"];

// Helper for GOV.UK Atom feeds (documented at https://www.gov.uk/help/feeds).
const gov = (slug: string) => `https://www.gov.uk/government/organisations/${slug}.atom`;

export const FEEDS: FirmFeed[] = [
  // ====================================================================
  // TIER 1 — UK regulators, government & courts (authoritative)
  // ====================================================================

  // HMRC — tax
  { firmName: "HMRC", feedUrls: [gov("hm-revenue-customs")] },

  // HM Treasury — financial regulation & tax
  { firmName: "HM Treasury", feedUrls: [gov("hm-treasury")] },

  // Companies House — corporate filings rules
  { firmName: "Companies House", feedUrls: [gov("companies-house")] },

  // Insolvency Service — R&I
  { firmName: "Insolvency Service", feedUrls: [gov("insolvency-service")] },

  // Department for Business & Trade — corporate, NSIA, governance
  { firmName: "Department for Business & Trade", feedUrls: [gov("department-for-business-and-trade")] },

  // Bank of England — banking, monetary policy, PRA-side supervision
  {
    firmName: "Bank of England",
    feedUrls: [
      "https://www.bankofengland.co.uk/news/rss",
      "https://www.bankofengland.co.uk/rss/news",
      "https://www.bankofengland.co.uk/news/news.rss",
    ],
  },

  // Bank of England — PRA Statements of Policy / Supervisory Statements
  {
    firmName: "PRA / BoE supervision",
    feedUrls: [
      "https://www.bankofengland.co.uk/prudential-regulation/publication/rss",
      "https://www.bankofengland.co.uk/rss/prudential-regulation",
    ],
  },

  // FCA — banking, funds reg, market conduct
  {
    firmName: "FCA",
    feedUrls: [
      "https://www.fca.org.uk/news/rss.xml",
      "https://www.fca.org.uk/news/feed",
      "https://www.fca.org.uk/news.rss",
    ],
  },

  // The Takeover Panel — UK Takeover Code
  {
    firmName: "Takeover Panel",
    feedUrls: [
      "https://www.thetakeoverpanel.org.uk/rss",
      "https://www.thetakeoverpanel.org.uk/feed",
      "https://www.thetakeoverpanel.org.uk/disclosures/feed",
    ],
  },

  // Financial Reporting Council — corporate governance, audit, reporting
  {
    firmName: "FRC",
    feedUrls: [
      "https://www.frc.org.uk/news/feed",
      "https://www.frc.org.uk/feed",
      "https://www.frc.org.uk/news/rss",
    ],
  },

  // BAILII — UK case law
  {
    firmName: "BAILII — UK Supreme Court",
    feedUrls: [
      "http://www.bailii.org/uk/cases/UKSC/feed.rss",
      "http://www.bailii.org/cgi-bin/feed.cgi?path=/uk/cases/UKSC/",
      "http://www.bailii.org/uk/cases/UKSC/rss.xml",
    ],
  },
  {
    firmName: "BAILII — Court of Appeal (Civil)",
    feedUrls: [
      "http://www.bailii.org/ew/cases/EWCA/Civ/feed.rss",
      "http://www.bailii.org/cgi-bin/feed.cgi?path=/ew/cases/EWCA/Civ/",
    ],
  },
  {
    firmName: "BAILII — High Court (Chancery)",
    feedUrls: [
      "http://www.bailii.org/ew/cases/EWHC/Ch/feed.rss",
      "http://www.bailii.org/cgi-bin/feed.cgi?path=/ew/cases/EWHC/Ch/",
    ],
  },
  {
    firmName: "BAILII — High Court (Commercial)",
    feedUrls: [
      "http://www.bailii.org/ew/cases/EWHC/Comm/feed.rss",
      "http://www.bailii.org/cgi-bin/feed.cgi?path=/ew/cases/EWHC/Comm/",
    ],
  },

  // ====================================================================
  // TIER 2 — Industry bodies & commentary
  // ====================================================================

  // AIMA — alternative investment / hedge funds
  {
    firmName: "AIMA",
    feedUrls: ["https://www.aima.org/feed", "https://www.aima.org/news/feed", "https://www.aima.org/rss"],
  },

  // BVCA — UK private equity & venture capital
  {
    firmName: "BVCA",
    feedUrls: ["https://www.bvca.co.uk/feed", "https://www.bvca.co.uk/news/feed", "https://www.bvca.co.uk/rss"],
  },

  // The Investment Association — UK asset management
  {
    firmName: "The Investment Association",
    feedUrls: ["https://www.theia.org/feed", "https://www.theia.org/news/feed", "https://www.theia.org/rss"],
  },

  // R3 — UK insolvency body
  {
    firmName: "R3",
    feedUrls: ["https://www.r3.org.uk/feed", "https://www.r3.org.uk/news/feed", "https://www.r3.org.uk/rss"],
  },

  // South Square — restructuring barristers' chambers
  {
    firmName: "South Square",
    feedUrls: ["https://southsquare.com/feed", "https://southsquare.com/feed/", "https://southsquare.com/rss"],
  },

  // Out-Law (Pinsent Masons) — multi-area firm publication
  {
    firmName: "Out-Law (Pinsent Masons)",
    feedUrls: [
      "https://www.pinsentmasons.com/out-law/feed",
      "https://www.pinsentmasons.com/out-law/rss",
      "https://www.pinsentmasons.com/out-law.rss",
    ],
  },

  // Loan Market Association — banking & syndicated lending
  {
    firmName: "Loan Market Association",
    feedUrls: ["https://www.lma.eu.com/feed", "https://www.lma.eu.com/news/feed", "https://www.lma.eu.com/rss"],
  },

  // Law Society Gazette — UK legal news
  {
    firmName: "Law Society Gazette",
    feedUrls: ["https://www.lawgazette.co.uk/feed", "https://www.lawgazette.co.uk/rss"],
  },

  // ====================================================================
  // TIER 3 — Specialist commentary
  // ====================================================================

  // Oxford Business Law Blog — corporate, funds reg, M&A commentary
  {
    firmName: "Oxford Business Law Blog",
    feedUrls: [
      "https://blogs.law.ox.ac.uk/business-law-blog/feed",
      "https://blogs.law.ox.ac.uk/business-law-blog/rss",
      "https://blogs.law.ox.ac.uk/business-law-blog/feed.xml",
    ],
  },

  // EU Law Analysis blog — retained EU law / cross-border
  {
    firmName: "EU Law Analysis",
    feedUrls: ["https://eulawanalysis.blogspot.com/feeds/posts/default", "https://eulawanalysis.blogspot.com/feeds/posts/default?alt=rss"],
  },

  // ESMA — relevant for UK fund managers active in EU
  {
    firmName: "ESMA",
    feedUrls: [
      "https://www.esma.europa.eu/press-news/esma-news/rss.xml",
      "https://www.esma.europa.eu/news/feed",
      "https://www.esma.europa.eu/rss",
    ],
    englandHints: UK_HINTS,
  },

  // CIOT — Chartered Institute of Taxation
  {
    firmName: "CIOT",
    feedUrls: ["https://www.tax.org.uk/feed", "https://www.tax.org.uk/rss"],
  },

  // ====================================================================
  // PREVIOUSLY-CONFIRMED FIRM FEEDS (keep what works)
  // ====================================================================

  {
    firmName: "A&O Shearman",
    feedUrls: ["https://www.aoshearman.com/insights/rss"],
    englandHints: UK_HINTS,
  },
  {
    firmName: "Slaughter and May",
    feedUrls: ["https://www.slaughterandmay.com/insights/rss"],
  },
];
