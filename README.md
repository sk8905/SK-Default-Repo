# Meridian Credit Intelligence

A clickable prototype of an information / market-intelligence platform for
**fundraising in European private credit** — modelled on the kind of product
*With Intelligence* offers, but focused on the alternative credit fund space
(direct lending, mezzanine, special situations, infrastructure & real estate
debt, structured credit, NAV/fund finance) across Europe.

> ⚠️ **All firms, funds, investors and figures in this prototype are fictional
> sample data** created for demonstration only.

## What it does

Five cross-linked modules:

| Module | What you get |
| --- | --- |
| **Dashboard** | KPIs (capital being sought, funds in market, closes) plus charts: capital raised by strategy, funds by status, capital by geography, and fundraising momentum over time. |
| **Funds** | Searchable / filterable directory of funds in market (strategy, status, geography) with raise-progress bars; click through to a full fund profile. |
| **Managers** | Directory of GPs with AUM, fund counts and strategies; manager profile shows all their funds and related intelligence. |
| **Investors** | LP / allocator profiles — type, AUM, private-credit allocation, ticket size, mandate status and strategy interests, with matching live funds. |
| **Intelligence** | A fundraising news feed (launches, first/final closes, mandates, personnel, strategy) tagged to managers and funds. |

Everything is interlinked: funds → managers → their other funds → interested
LPs → matching funds → related intelligence.

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
