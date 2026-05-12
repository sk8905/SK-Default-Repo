# Legal Updates — personal PWA

A private mobile web app that pulls client alerts from Magic Circle / Big Law / UK
specialist firms, uses Claude Haiku to classify them into five English-law
practice areas, and presents them as a feed you can add to your iPhone home
screen.

Practice areas: **Banking & Finance**, **Restructuring & Insolvency**,
**Corporate**, **Investment Fund Regulatory**, **Corporate & Investment Fund Tax**.

## Architecture

- **Next.js 14 / App Router**, served as a PWA so you can "Add to Home Screen" on iPhone.
- **Neon Postgres** (free tier) via Drizzle ORM.
- **Anthropic Claude Haiku 4.5** classifies each alert into one of the five areas and writes a 1–3 paragraph summary. The original source link is always shown.
- **Vercel Cron** triggers `/api/cron/ingest` daily at 07:00 UTC.
- Single-user password gate via signed HMAC cookie.

## Deploy in ~15 minutes

You'll do this once.

### 1. Create the cloud resources (all free tiers)

1. **Neon** — sign up at <https://console.neon.tech>, create a project, copy the connection string (looks like `postgresql://...neon.tech/...?sslmode=require`).
2. **Anthropic** — sign up at <https://console.anthropic.com>, create an API key.
3. **Vercel** — sign up at <https://vercel.com>, connect this GitHub repo, import the project. Stop at the env-vars step.

### 2. Set environment variables in Vercel

In the Vercel project → Settings → Environment Variables, add:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Neon connection string |
| `ANTHROPIC_API_KEY` | Your Claude API key |
| `APP_PASSWORD` | Any password you'll use to enter the app |
| `CRON_SECRET` | Any long random string |

Apply to **Production**, **Preview**, and **Development**. Click **Deploy**.

### 3. Create the database tables

Run this once locally (or use Drizzle Studio):

```bash
git clone <this repo>
cd <this repo>
npm install
# paste the same env vars into .env.local
npx drizzle-kit push
```

That creates the `developments` and `ingest_runs` tables in Neon.

### 4. Seed the last 30 days

In your browser, visit:

```
https://<your-vercel-domain>/api/ingest/seed?secret=<CRON_SECRET>&days=30
```

This takes a few minutes (it walks every feed, classifies each item with
Claude, writes results to Postgres). Output JSON tells you how many items were
added/skipped and any feed errors.

### 5. Verify the feeds

Open `https://<your-vercel-domain>/api/debug/feeds` (after logging in) to see
which firm feeds returned items and which 404'd. For any failing firm, find
the real RSS URL on their website (view-source, search `application/rss+xml`)
and update `src/lib/sources.ts`, then redeploy.

### 6. Add to iPhone home screen

1. Open the deployed URL in **Safari** on your iPhone.
2. Tap **Share** → **Add to Home Screen**.
3. Tap the icon. Enter your `APP_PASSWORD`. You're in.

The cron runs daily at 07:00 UTC and adds new items automatically.

## Adding or fixing firm feeds

Edit `src/lib/sources.ts` and redeploy. Each entry is `{ firmName, feedUrl, englandHints? }`. If a firm has multiple regional feeds, add a UK-specific one with no hints; or add the global feed plus hints like `["UK", "FCA", "HMRC"]` to filter.

## Costs

- Vercel Hobby + Neon free tier: **£0**
- Anthropic API: ~**£2–4/month** depending on volume (each alert costs roughly 0.001–0.002 USD using Haiku 4.5 with prompt caching).

## Caveats

- **AI summaries can be wrong or miss nuance.** Every item screen prominently links to the original alert. Always verify against the firm's own text before relying on it for client work.
- **Feed coverage is not complete.** Some firms publish only by email newsletter. Items behind login walls or in PDF-only newsletters won't be ingested.
- **One-jurisdiction filter is approximate.** For US-headquartered firms, the `englandHints` keyword check sometimes lets through non-UK content. Claude classification then drops most of it as "irrelevant", but expect occasional misses both ways.
- **Personal use only.** Don't redistribute, republish, or share the app — the summaries paraphrase firm alerts and the source links go to firms' own publications.

## Local development

```bash
npm install
cp .env.example .env.local
# fill in the env vars
npx drizzle-kit push  # creates tables
npm run dev
```

App runs at <http://localhost:3000>. Run a seed locally with `npm run seed`.
