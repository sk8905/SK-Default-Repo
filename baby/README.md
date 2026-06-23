# Little Steps — baby development tracker

A **private, offline-first, zero-build** single-page app to track a baby's
development, sleep, feeding, milk, weaning/allergens, growth, vaccinations,
health checks, and the nursery/school timeline — grounded in **UK (NHS/UKHSA),
Irish (HSE) and French (ameli/sante.gouv)** guidance.

Built for an Irish–French family raising a baby (born early June 2025) in the UK.

## Standalone — deliberately separate from Meridian

This app is **completely independent** of the Meridian platform in this repo:

- It is a single self-contained file: [`index.html`](index.html). All HTML, CSS,
  JavaScript and guidance data are inline. **No build step, no dependencies, no
  server, no API.**
- It does **not** use Meridian's sign-in, Cloudflare Access, Worker, KV, or any
  shared code, and is **not linked** from the Meridian landing page.
- All data is stored **only in the browser** (`localStorage`). Nothing is sent
  anywhere. There is JSON **export/import** for backup and moving between
  devices.

Because it is one static file, you can run it anywhere:

- **Open locally** — double-click `index.html` (`file://`), works fully offline.
- **Any static host** — GitHub Pages, Netlify, Cloudflare Pages, etc.
- **USB stick / phone** — copy the one file.

> ⚠️ This repo is currently served behind Meridian's Cloudflare Access login. If
> you host this file *here*, that login may also gate `/baby/`. To keep it truly
> separate and independently accessible, host the single file in its own
> place (e.g. a separate GitHub Pages repo).

## Future: optional login (kept separate from Meridian)

A sign-in is **not** built yet and, when added, should be **independent of
Meridian** (its own auth, its own storage). Sensible options for later:

- Cloudflare Access / Pages on a **separate project** with its own policy, plus
  a small Worker + KV (or D1) to sync the same JSON the app already
  exports — keyed by the signed-in email. The app's state is a single JSON
  object, so wiring sync is straightforward.
- Or a lightweight third-party auth (e.g. a passcode/passkey) gating a private
  deployment.

The current local-only model needs no login to be useful and private.

## What it tracks

- **Today** — live age, what's overdue/coming up, quick logging, monthly tips.
- **Milestones** — motor/language/social by age band, with red-flag guidance.
- **Feeding & milk** — feed log (breast/bottle/solids), milk norms, vitamin D
  (UK/IE/FR doses differ — pick one), weaning + a 14-allergen introduction
  tracker, foods to avoid.
- **Sleep** — sleep log, age norms, safe-sleep (SIDS/MIN) guidance.
- **Growth** — weight/length/head log with a WHO-50th-centile reference line.
- **Vaccinations** — UK/IE/FR schedules computed from date of birth (cohort:
  baby born after the relevant 2024/2025 schedule changes), tick-off tracking.
- **Health checks** — UK Red Book reviews, Irish PHN/GP checks, French 20
  examens obligatoires (with the 8-day / 9-month / 24-month certificates).
- **Nursery & school** — England funded-hours timeline and school-start
  (Reception ≈ Sep 2029 for a June 2025 baby; summer-born deferral noted), with
  Irish/French equivalents.
- **Guides & sources** — a three-country comparison and source links.
- **Settings & data** — profile, country visibility, export/import/reset.

## Not medical advice

Ages, doses and schedules are general guides from public sources and change over
time. Always follow your GP, health visitor, PHN or paediatrician, and your Red
Book / carnet de santé. Schedules were checked against official sources around
June 2026 — re-verify before acting on dates.
