# Meridian Credit Intelligence

A clickable prototype of an information / market-intelligence platform for
**fundraising in European private credit** — modelled on the kind of product
*With Intelligence* offers, but focused on the alternative credit fund space
(direct lending, mezzanine, special situations, infrastructure & real estate
debt, structured credit, NAV/fund finance) across Europe.

> ℹ️ **The dataset is now real**, compiled **16 June 2026 from public sources
> only** (manager & investor press releases, regulatory/results disclosures and
> trade press) — covering ~112 managers, ~86 funds, ~23 LP allocators, ~48
> fundraising-news items and ~55 deal-activity items. It is **not affiliated with, and contains no data
> from, any subscription database** (With Intelligence, Preqin, PitchBook,
> Debtwire). Figures are shown in € for consistency (several originally in
> USD/GBP, so approximate); items marked "Est." or "undisclosed" are proxies or
> not precisely disclosed — verify against the cited sources before relying on
> any figure. Each record carries source links and an "as of" date in the app;
> the fuller sourcing trail is in [`docs/research-notes.md`](docs/research-notes.md).

## What it does

Nine cross-linked modules:

| Module | What you get |
| --- | --- |
| **Dashboard** | KPIs (funds in market, capital raised, closes) plus charts: capital raised by strategy, funds by status, capital by geography, fundraising momentum by quarter, and latest intelligence + deal-activity strips. |
| **Funds** | Searchable / filterable directory of funds in market (strategy, status, geography) with raise-progress bars; click through to a full fund profile. |
| **Managers** | Directory of GPs with AUM, fund counts and strategies; manager profile shows all their funds, known investors and related intelligence. |
| **Investors** | LP / allocator profiles — type, AUM, private-credit allocation, ticket size, mandate status and strategy interests, with known commitments and matching live funds. |
| **Intelligence** | A fundraising news feed (launches, first/final closes, mandates, personnel, strategy) tagged to managers and funds, sorted newest-first. |
| **Deals** | A deal-activity feed (investments, financings, disposals/exits, refinancings, restructurings, bankruptcies/distress, NPL/portfolio, M&A) tagged to managers/funds; also shown on each manager and fund profile. |
| **Mandates** | Live LP mandates / RFPs and new-fund launches, plus a "who backs whom" LP → manager commitments map. |
| **League Tables** | Rankings: top managers by capital raised, largest fund closes, biggest investors by AUM, most active managers. |
| **Watchlist** | Follow any manager / fund / investor (saved locally in your browser) to build a personalised intelligence feed. |

Everything is interlinked: funds → managers → their other funds → known/interested
LPs → their commitments → matching funds → related intelligence.

## Tech

Deliberately a **zero-build, dependency-free static app** so it runs instantly
and offline:

- Plain HTML + CSS + ES-module JavaScript — no framework, no bundler, no npm install.
- Charts are hand-rolled inline SVG (`js/charts.js`) — no charting library or CDN.
- Hash-based client-side routing.

```
index.html        # shell + top navigation
css/styles.css    # all styling
js/data.js        # sample dataset (managers, funds, LPs, intelligence)
js/charts.js      # inline-SVG bar / donut / line charts
js/app.js         # router + all views
```

## Run it

Because it uses ES modules, open it via a local web server (not `file://`):

```bash
# from the repo root:
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Extending toward a real platform

This prototype is intentionally front-end only. Natural next steps:

1. Replace `js/data.js` with a real API (the data shapes are already normalised
   with IDs and lookups).
2. Add a backend + database (managers, funds, LPs, intelligence as tables).
3. Add auth, saved searches, alerts/email digests on the intelligence feed,
   CSV/Excel export, and an admin/back-office for data entry.
4. Layer in analytics: league tables, time-to-close, average fund-size trends,
   and investor-coverage tracking (which LPs a GP has/hasn't met).
