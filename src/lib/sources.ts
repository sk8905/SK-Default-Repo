// Law firm RSS/Atom feed sources.
//
// IMPORTANT: These URLs are my best guesses based on common patterns. Many
// firms publish a feed but the exact URL varies. After deploying, run the
// ingestion once and check /api/debug/feeds (or the logs of /api/cron/ingest)
// to see which feeds 404 and need fixing. Update this file and redeploy.
//
// To find a firm's real feed: visit their insights/knowledge page, view-source,
// and search for `application/rss+xml` or `application/atom+xml` in <link> tags.

export type FirmFeed = {
  firmName: string;
  feedUrl: string;
  // If a feed mixes jurisdictions, set this so we can filter to English-law items.
  // Empty array = accept everything from this feed.
  englandHints?: string[];
};

// Hints used to filter for English-law content when a feed is multi-jurisdiction.
const UK_HINTS = ["UK", "United Kingdom", "England", "English law", "London", "FCA", "PRA", "HMRC", "HMT", "PRA"];

export const FEEDS: FirmFeed[] = [
  // ---------- Magic Circle ----------
  { firmName: "A&O Shearman", feedUrl: "https://www.aoshearman.com/en/insights/rss" },
  { firmName: "Clifford Chance", feedUrl: "https://www.cliffordchance.com/insights.rss.xml" },
  { firmName: "Freshfields", feedUrl: "https://www.freshfields.com/en-gb/our-thinking/feed/" },
  { firmName: "Linklaters", feedUrl: "https://www.linklaters.com/en/rss/insights" },
  { firmName: "Slaughter and May", feedUrl: "https://www.slaughterandmay.com/insights/rss" },

  // ---------- US Big Law with strong London / English-law practices ----------
  { firmName: "Latham & Watkins", feedUrl: "https://www.lw.com/en/rss/insights", englandHints: UK_HINTS },
  { firmName: "Kirkland & Ellis", feedUrl: "https://www.kirkland.com/feed/publications", englandHints: UK_HINTS },
  { firmName: "White & Case", feedUrl: "https://www.whitecase.com/insight-rss", englandHints: UK_HINTS },
  { firmName: "Weil Gotshal", feedUrl: "https://www.weil.com/feed/articles", englandHints: UK_HINTS },
  { firmName: "Skadden", feedUrl: "https://www.skadden.com/feeds/insights", englandHints: UK_HINTS },
  { firmName: "Sidley Austin", feedUrl: "https://www.sidley.com/en/insights/feed", englandHints: UK_HINTS },
  { firmName: "Davis Polk", feedUrl: "https://www.davispolk.com/feed/insights", englandHints: UK_HINTS },
  { firmName: "Sullivan & Cromwell", feedUrl: "https://www.sullcrom.com/rss/publications", englandHints: UK_HINTS },
  { firmName: "Simpson Thacher", feedUrl: "https://www.stblaw.com/rss/publications", englandHints: UK_HINTS },
  { firmName: "Paul Weiss", feedUrl: "https://www.paulweiss.com/rss/publications", englandHints: UK_HINTS },
  { firmName: "Milbank", feedUrl: "https://www.milbank.com/en/news/feed", englandHints: UK_HINTS },
  { firmName: "Cleary Gottlieb", feedUrl: "https://www.clearygottlieb.com/news-and-insights/feed", englandHints: UK_HINTS },
  { firmName: "Hogan Lovells", feedUrl: "https://www.hoganlovells.com/en/feed/publications", englandHints: UK_HINTS },
  { firmName: "Norton Rose Fulbright", feedUrl: "https://www.nortonrosefulbright.com/en-gb/knowledge/feed" },

  // ---------- Silver Circle / UK specialists (essential for funds + fund tax) ----------
  { firmName: "Macfarlanes", feedUrl: "https://www.macfarlanes.com/what-we-think/in-depth/rss/" },
  { firmName: "Travers Smith", feedUrl: "https://www.traverssmith.com/knowledge/rss/" },
  { firmName: "Ashurst", feedUrl: "https://www.ashurst.com/en/insights/feed/" },
];
