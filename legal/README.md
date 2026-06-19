# Meridian Legal — English-law legal & case-law alerts

A **zero-build, dependency-free static web app** that surfaces Practical-Law-style
legal updates and case-law alerts for English-law practice areas:

- **Banking & Finance**
- **Restructuring & Insolvency (R&I)**
- **Corporate / M&A**
- **Funds Regulatory**
- **Fund Tax**

Each alert is curated from the public **insights / know-how / legal-update**
pages of **UK Magic Circle**, **UK Silver Circle** and the **London offices of
US-elite firms**. It lives in `/legal/` so it sits alongside the existing
*Meridian* app in the same repo without touching it — the same Cloudflare Worker
serves both (Meridian Credit at `/credit/`, Meridian Legal at `/legal/`).

> ⚠️ The seed alerts summarise **genuine** English-law developments so the app is
> realistic out of the box, but the summaries are written for this prototype and
> each *Source* link points at the firm's public insights landing page (deep
> links rot), **not** a verbatim article. This is **not legal advice** — verify
> against the cited source. Nothing leaves your browser.

## What it does

| View | Route | What you get |
| --- | --- | --- |
| **Dashboard** | `#/` | KPIs, inline-SVG charts (alerts by practice area, by source tier, by month), browse-by-area cards and the latest updates. |
| **All updates** | `#/list` | Multi-select filters (practice area, source tier, type, firm), full-text search, and a "Saved only" toggle. Deep-linkable, e.g. `#/list?area=banking`, `#/list?tier=magic`, `#/list?q=carried%20interest`. |
| **Detail** | `#/item/<id>` | Full summary, key points, court/citation for case notes, tags, the source link, and related updates. |

- **Save** any alert with the ☆ button — stored in `localStorage` (per-device, no
  account). The nav shows a saved count.
- **"New since last visit"** badges highlight alerts dated after your previous
  visit.

## Files

```
legal/
  index.html        # shell: nav + empty <main id="app">, ?v= cache-buster on css/js
  css/styles.css    # all styling (responsive, accessible, no horizontal overflow)
  js/data.js        # ALL data hardcoded as ES-module exports (items, firms, areas…)
  js/charts.js      # inline-SVG bar / donut / column charts — no chart library
  js/app.js         # hash router (#/, #/list, #/item/<id>) + all views
```

## Run it locally

ES modules need a web server (not `file://`):

```bash
# from the repo root
python3 -m http.server 8000
# then open http://localhost:8000/legal/
```

## Curate the feed

Everything is in **`legal/js/data.js`** — add objects to `items` (give each a
unique `id`), keep `area`/`firm`/`type` pointing at ids defined at the top of the
file, and bump `LAST_REVIEWED`. To cache-bust after edits, increment the `?v=`
number in `index.html` (and the matching import suffixes in `app.js`).

## Deploy on Cloudflare (free tier)

No change to your existing setup is needed — the repo's `wrangler.jsonc` already
serves the whole repo as static assets, so once Cloudflare is connected to the
repo (see [`../docs/cloudflare-setup.md`](../docs/cloudflare-setup.md)) Meridian Legal
is live at `https://<your-worker>.<account>.workers.dev/legal/` (or
`https://<project>.pages.dev/legal/`). The one-time dashboard clicks:

1. **Workers & Pages → Create → Pages → Connect to Git**, pick this repo, framework
   preset **None**, build command **blank**, output dir **`/`**. Save & deploy.
2. Push to your production branch → Cloudflare auto-deploys. Visit `/legal/`.

### Make it private (optional, one-time)

Gate the whole site to just you with **Cloudflare Access** (free):
**Zero Trust → Access → Applications → Add → Self-hosted**, set the app domain to
your `*.pages.dev`/`workers.dev` host, add an **Allow** policy with **Include →
Emails → your email**. Default **One-time PIN** login needs no extra setup. Full
walk-through in [`../docs/cloudflare-setup.md`](../docs/cloudflare-setup.md).

### Sync saved alerts across devices later (optional)

Saved alerts are device-local today. To sync them, add a tiny Worker endpoint
backed by **Cloudflare KV** (nothing else) — the pattern already exists in this
repo at [`../src/index.js`](../src/index.js) / [`../functions/api/watchlist.js`](../functions/api/watchlist.js).
Add a `/api/legal-saved` route keyed by the Access identity, then swap the two
functions in the *"Saved state"* block of `js/app.js` to `fetch` that endpoint.
This stays within the free tier and needs no API key.
