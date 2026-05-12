import { XMLParser } from "fast-xml-parser";

export type FeedItem = {
  title: string;
  url: string;
  publishedAt: Date;
  description: string;
  content: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  textNodeName: "#text",
});

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function asText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(asText).join(" ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.__cdata === "string") return o.__cdata;
    if (typeof o["#text"] === "string") return o["#text"];
  }
  return "";
}

function parseDate(s: string): Date {
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

export async function fetchFeed(url: string, timeoutMs = 15000): Promise<FeedItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "LegalUpdatesPWA/0.1 (+personal-use)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return parseFeed(xml);
  } finally {
    clearTimeout(timer);
  }
}

export function parseFeed(xml: string): FeedItem[] {
  // Strip BOM and any leading whitespace before the XML declaration —
  // some servers prepend these and they break fast-xml-parser.
  let clean = xml;
  if (clean.charCodeAt(0) === 0xfeff) clean = clean.slice(1);
  clean = clean.replace(/^\s+/, "");

  let tree: any;
  try {
    tree = parser.parse(clean);
  } catch {
    return [];
  }

  // RSS 2.0
  if (tree?.rss?.channel) {
    const channel = tree.rss.channel;
    const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
    return items.map(rssItemToFeedItem);
  }

  // RSS 1.0 / RDF
  const rdf = tree?.["rdf:RDF"] ?? tree?.RDF;
  if (rdf) {
    const items = Array.isArray(rdf.item) ? rdf.item : rdf.item ? [rdf.item] : [];
    return items.map(rssItemToFeedItem);
  }

  // Atom
  if (tree?.feed) {
    const entries = Array.isArray(tree.feed.entry) ? tree.feed.entry : tree.feed.entry ? [tree.feed.entry] : [];
    return entries.map((e: any) => {
      const linkAttr = Array.isArray(e.link) ? e.link[0] : e.link;
      const url = typeof linkAttr === "string" ? linkAttr : linkAttr?.["@_href"] || "";
      const summary = stripHtml(asText(e.summary));
      const content = stripHtml(asText(e.content) || summary);
      return {
        title: stripHtml(asText(e.title)),
        url,
        publishedAt: parseDate(asText(e.updated) || asText(e.published) || ""),
        description: summary,
        content,
      };
    });
  }
  return [];
}

function rssItemToFeedItem(it: any): FeedItem {
  const description = stripHtml(asText(it.description));
  const content = stripHtml(asText(it["content:encoded"]) || description);
  return {
    title: stripHtml(asText(it.title)),
    url: asText(it.link) || asText(it.guid) || "",
    publishedAt: parseDate(asText(it.pubDate) || asText(it["dc:date"]) || asText(it.date) || ""),
    description,
    content,
  };
}
