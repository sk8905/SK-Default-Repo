# Auto-refresh routine instructions (Claude Routines)

These are the instruction prompts pasted into the two Claude Routines that keep
the Credit dataset current. They run a Claude Code session against this repo.
Keep this file in sync with the Routines UI — it is the source of truth for the
prompts.

> **Repo structure note.** The Meridian **Credit** app now lives in the
> **`credit/`** folder (after the repo was split into a root sign-in landing
> page + `credit/` + `legal/`). All Credit data and assets are under `credit/`,
> and the site deploys from the **`main`** branch (Cloudflare redeploys on every
> push to `main`). The routines below target `credit/…` paths. The `legal/`
> (Lexalert) app has no refresh routine yet.

Shared invariants (both routines):

- **Sync first.** Always start from the latest `main`: run `git fetch origin`,
  then `git checkout -B claude/affectionate-einstein-9hhzga origin/main` so the
  working branch can never start from a stale copy (this was the cause of an
  earlier "the routine ran but the platform didn't update" problem).
- **Cache-buster — bump all four together.** There are four `?v=YYYYMMDD-N`
  tokens that MUST change in lockstep, or the browser keeps a stale `app.js`
  that still imports the old `data.js`:
  1. `css/styles.css?v=` in `credit/index.html`
  2. `js/app.js?v=` in `credit/index.html`
  3. `./data.js?v=` import in `credit/js/app.js`
  4. `./charts.js?v=` import in `credit/js/app.js`
  Set them to today's date + sequence 1 (e.g. `v=20260619-1`), incrementing the
  sequence on repeat runs the same day.
- **Validate** before committing: `node --check credit/js/data.js`.
- **Update** `DATA_UPDATED` in `credit/js/data.js` to today's date.
- **Sourcing:** prefer primary/verifiable public sources — the manager's own
  press release, Bloomberg, Reuters, Private Debt Investor, Alternative Credit
  Investor, Creditflux, GlobalCapital, law-firm deal pages, BusinessWire/PR
  Newswire. The public-source rule is no longer strict, but never invent a URL,
  date or figure, and verify each item's EXACT publication date from the source
  (a wrong date was a past error). Skip pure data-aggregators (GuruFocus,
  Tracxn, ZoomInfo, Crunchbase, PitchBook, SimplyWall, MarketBeat).
- **Dedupe** every candidate by URL and normalised headline against the existing
  records before adding it.
- **Publish.** Commit, then fast-forward-merge
  `claude/affectionate-einstein-9hhzga` into `main` and push BOTH branches —
  pushing to `main` is what triggers the live redeploy.
- **Commit message** must end with these two trailers:
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  Claude-Session: <this session's URL>
  ```
- If nothing qualifies, make no data change, do not commit, and just report
  "no new items".

---

## Daily routine — deal news only (weekday mornings)

> Update my Meridian CREDIT platform with new European private-credit DEAL news
> only — investments, exits, refinancings, restructurings, distress,
> NAV/fund-finance — and publish it live. The Credit app lives in the `credit/`
> folder and deploys from `main`. Follow the shared invariants in
> `docs/refresh-routines.md`.
>
> 1. Sync the working branch to the latest `main`
>    (`git fetch origin` then `git checkout -B claude/affectionate-einstein-9hhzga origin/main`).
> 2. Search for European private-credit deals reported in roughly the last 36
>    hours from primary/reputable public sources. Verify each deal's exact date.
> 3. For each genuinely new deal, append an object to the `deals` array in
>    `credit/js/data.js` with: `id` = next sequential `d<n>` (current max is d258,
>    so next is d259), `date` (YYYY-MM-DD), `managerId` (must match an existing
>    manager — if the manager isn't in the dataset, skip the item), `fundId` if
>    applicable, `type` (reuse an existing deal `type` value), `headline`,
>    `summary`, `sourceUrl`. Dedupe against existing `deals`.
> 4. Update `DATA_UPDATED`, bump all four `credit/` cache-busters, validate,
>    commit, ff-merge to `main`, push both branches.
> 5. Reply with a one-line summary of what was added (or "no new deals").

## Weekly routine — full refresh (Monday mornings)

> Do a full weekly refresh of my Meridian CREDIT platform covering (a) fundraising
> intelligence, (b) deal activity, and (c) managers' own-website news, and publish
> it live. The Credit app lives in the `credit/` folder and deploys from `main`.
> Follow the shared invariants in `docs/refresh-routines.md`.
>
> 1. Sync the working branch to the latest `main`
>    (`git fetch origin` then `git checkout -B claude/affectionate-einstein-9hhzga origin/main`).
> 2. **Fundraising intelligence** — find fund launches, first/final closes,
>    mandates and strategy news from the past week. Append to the `intel` array in
>    `credit/js/data.js`: `id` = next sequential `i<n>` (current max is i320, next
>    is i321), `date`, `type` (reuse an existing intel `type` value), `headline`,
>    `summary`, `managerId`/`fundId`, `sourceUrl`.
> 3. **Deals** — same as the daily routine but for the past week; append to
>    `deals` in `credit/js/data.js` (next id after the current max d258).
> 4. **In the news (webNews)** — for managers with an active news/press/insights
>    page, find announcements published in the past week and append to that
>    manager's `webNews` array in `credit/js/data.js` using the
>    `{date, outlet, title, url}` shape, deduped against the manager's existing
>    `news` + `webNews`. Most manager sites block automated fetching, so
>    enumerate new article URLs with `site:<domain>` web searches and verify each
>    date; prefer the manager's own press-release URL, using the manager's name as
>    the `outlet`.
> 5. Update `DATA_UPDATED`, bump all four `credit/` cache-busters, validate,
>    commit, ff-merge to `main`, push both branches.
> 6. Reply with a short summary: counts of new intel / deals / webNews items.

---

### Notes

- The `legal` field (general counsel per manager) changes rarely and is not part
  of the routine refresh; refresh it manually if a GC change is reported.
- New `deals`/`intel` `type` values that aren't in `dealTypeClass` /
  `intelTypeClass` (in `credit/js/app.js`) still render, just with default chip
  styling — reuse existing type strings where possible, or add the class.
- The `legal/` (Lexalert) app currently has no refresh routine. If one is added,
  give it its own prompt targeting `legal/js/data.js` and the four `legal/`
  cache-busters.
