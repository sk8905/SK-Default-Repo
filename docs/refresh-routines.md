# Auto-refresh routine instructions (Claude Routines)

These are the instruction prompts pasted into the two Claude Routines that keep
the dataset current. They run a Claude Code session against this repo. Keep this
file in sync with the Routines UI — it is the source of truth for the prompts.

Shared invariants (both routines):

- **Branch:** develop on `claude/affectionate-einstein-9hhzga` (create if it
  doesn't exist), then fast-forward-merge into `main` and push BOTH branches.
- **Cache-buster — bump all four together.** There are four `?v=YYYYMMDD-N`
  tokens that MUST change in lockstep, or the browser keeps a stale `app.js`
  that still imports the old `data.js` (this is the usual "my change isn't
  showing" cause):
  1. `css/styles.css?v=` in `index.html`
  2. `js/app.js?v=` in `index.html`
  3. `./data.js?v=` import in `js/app.js`
  4. `./charts.js?v=` import in `js/app.js`
  Set them to today's date + sequence 1 (e.g. `v=20260619-1`), incrementing the
  sequence on repeat runs the same day.
- **Validate** before committing: `node --check js/data.js`.
- **Update** `DATA_UPDATED` to today's date.
- **Sourcing:** prefer primary/verifiable public sources — the manager's own
  press release, Bloomberg, Reuters, Private Debt Investor, Alternative Credit
  Investor, Creditflux, GlobalCapital, law-firm deal pages, BusinessWire/PR
  Newswire. The public-source rule is no longer strict, but never invent a URL,
  date or figure, and verify each item's EXACT publication date from the source
  (a wrong date was a past error). Skip pure data-aggregators (GuruFocus,
  Tracxn, ZoomInfo, Crunchbase, PitchBook, SimplyWall, MarketBeat).
- **Dedupe** every candidate by URL and normalised headline against the existing
  records before adding it.
- **Commit message** must end with these two trailers:
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  Claude-Session: <this session's URL>
  ```
- If nothing qualifies, make no data change, do not commit, and just report
  "no new items".

---

## Daily routine — deal news only (weekday mornings)

> Update the Meridian Credit Intelligence dataset with new European
> private-credit DEAL news only — investments, exits, refinancings,
> restructurings, distress, NAV/fund-finance. Follow the shared invariants in
> `docs/refresh-routines.md`.
>
> 1. Search for European private-credit deals reported in roughly the last 36
>    hours from primary/reputable public sources. Verify each deal's exact date.
> 2. For each genuinely new deal, append an object to the `deals` array in
>    `js/data.js` with: `id` = next sequential `d<n>` (current max is d257, so
>    next is d258), `date` (YYYY-MM-DD), `managerId` (must match an existing
>    manager — if the manager isn't in the dataset, skip the item), `fundId` if
>    applicable, `type` (reuse an existing deal `type` value), `headline`,
>    `summary`, `sourceUrl`. Dedupe against existing `deals`.
> 3. Update `DATA_UPDATED`, bump all four cache-busters, validate, commit,
>    ff-merge to `main`, push both branches.
> 4. Reply with a one-line summary of what was added (or "no new deals").

## Weekly routine — full refresh (Monday mornings)

> Do a full weekly refresh of the Meridian Credit Intelligence dataset covering
> (a) fundraising intelligence, (b) deal activity, and (c) managers' own-website
> news. Follow the shared invariants in `docs/refresh-routines.md`.
>
> 1. **Fundraising intelligence** — find fund launches, first/final closes,
>    mandates and strategy news from the past week. Append to the `intel` array:
>    `id` = next sequential `i<n>` (current max is i320, next is i321), `date`,
>    `type` (reuse an existing intel `type` value), `headline`, `summary`,
>    `managerId`/`fundId`, `sourceUrl`.
> 2. **Deals** — same as the daily routine but for the past week; append to
>    `deals` (next id after the current max).
> 3. **In the news (webNews)** — for managers with an active news/press/insights
>    page, find announcements published in the past week and append to that
>    manager's `webNews` array using the `{date, outlet, title, url}` shape,
>    deduped against the manager's existing `news` + `webNews`. Most manager
>    sites block automated fetching, so enumerate new article URLs with
>    `site:<domain>` web searches and verify each date; prefer the manager's own
>    press-release URL, using the manager name as the `outlet`.
> 4. Update `DATA_UPDATED`, bump all four cache-busters, validate, commit,
>    ff-merge to `main`, push both branches.
> 5. Reply with a short summary: counts of new intel / deals / webNews items.

---

### Notes

- The `legal` field (general counsel per manager) changes rarely and is not part
  of the routine refresh; refresh it manually if a GC change is reported.
- New `deals`/`intel` `type` values that aren't in `dealTypeClass` /
  `intelTypeClass` (in `js/app.js`) still render, just with default chip
  styling — reuse existing type strings where possible, or add the class.
