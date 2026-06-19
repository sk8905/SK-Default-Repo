# Auto-refresh routine instructions (Claude Routines)

These are the instruction prompts pasted into the Claude Routines that keep the
datasets current. They run a Claude Code session against this repo. Keep this
file in sync with the Routines UI — it is the source of truth for the prompts.

There are three routines: **Credit daily** (deals), **Credit weekly** (full
refresh), and **Legal daily** (full refresh).

> **Repo structure note.** The repo is split into a root sign-in landing page +
> **`credit/`** (Meridian Credit) + **`legal/`** (Meridian Legal / Lexalert).
> Each app keeps all its data and assets under its own folder, and the site
> deploys from the **`main`** branch (Cloudflare redeploys on every push to
> `main`). The Credit routines target `credit/…` paths; the Legal routine
> targets `legal/…` paths.

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

## Legal (Lexalert) — daily full refresh (every morning)

Self-contained (the Credit invariants above are credit-specific). Note the Legal
app uses **`LAST_REVIEWED`** (not `DATA_UPDATED`), its main feed is the **`items`**
array, and it tracks publications from a fixed set of tracked sources only
(19 law firms plus South Square chambers). The Case Law page (`cases` +
`caseSummaries`) is refreshed daily too — see step 4.

> Daily full refresh of my Meridian LEGAL platform (Lexalert) — new English-law
> legal developments, client alerts, case notes and insights from the tracked law
> firms, plus any significant new judgments — and publish it live. The Legal app
> lives in the `legal/` folder and deploys from `main` (Cloudflare redeploys on
> every push to `main`).
>
> 1. SYNC: run `git fetch origin`, then base your work on the latest main:
>    `git checkout -B claude/affectionate-einstein-9hhzga origin/main`. Do all
>    work on this branch.
> 2. SEARCH for English-law legal developments published in roughly the last 36
>    hours across the five practice areas: Banking & Finance (`banking`),
>    Restructuring & Insolvency (`ri`), Corporate / M&A (`corporate`), Funds
>    Regulatory (`fundsreg`) and Fund Tax (`fundtax`). Cover the tracked firms'
>    own insights / client-alert pages, plus primary sources: BAILII and
>    caselaw.nationalarchives.gov.uk (judgments), gov.uk, the FCA, HM Treasury,
>    HMRC, and reputable legal press (Law Society Gazette, Lexology, Practical
>    Law). Most firm sites block automated fetching, so enumerate new article
>    URLs with `site:<domain>` web searches and verify each publication date.
>    Never invent a URL, date or quote; verify each item's EXACT date from the
>    source. Skip paywalled items you can't confirm.
> 3. For each genuinely new item, append an object to the `items` array in
>    `legal/js/data.js` with: `id` = next sequential `u<n>` — COMPUTE the current
>    maximum `u` id in the file and use the next integer; do NOT trust any number
>    quoted here (e.g. as at 2026-06-19 the max was u131, so the next is u132, but
>    always re-derive it); `title`; `area` = one of banking/ri/corporate/fundsreg/
>    fundtax; `areas` = array of the relevant area id(s); `type` = one of
>    case/update/alert/insight/knowhow; `firm` = the publishing firm's id, which
>    MUST be one of: aoshearman, cliffordchance, freshfields, linklaters,
>    slaughtermay, ashurst, hsf, macfarlanes, traverssmith, simmons, latham,
>    kirkland, whitecase, weil, sidley, cleary, ropesgray, simpsonthacher,
>    davispolk, southsquare (skip the item if it isn't from one of these
>    firms/chambers); `date`
>    (YYYY-MM-DD); `jurisdiction` (e.g. "England & Wales"); `court` and `citation`
>    for case notes; `summary` (2–4 sentences); `points` (array of 2–4 short
>    bullets); `tags` (array of keywords); and the source `url`. Dedupe each
>    candidate by URL and normalised title against the existing `items`.
> 4. CASE LAW (refresh daily) — search BAILII and
>    caselaw.nationalarchives.gov.uk for English judgments handed down in roughly
>    the last 36 hours that fall within the five practice areas (banking, ri,
>    corporate, fundsreg, fundtax) AND one of the tracked courts ONLY: Supreme
>    Court, Court of Appeal, High Court (Ch), High Court (Comm), High Court (KB),
>    High Court (QB). For each new judgment, append to the `cases` array in
>    `legal/js/data.js` (`id` = next sequential `c<n>` — COMPUTE the current
>    maximum `c` id in the file and use the next integer; do NOT trust any quoted
>    number; fields: id, name, citation, court — use exactly one of the tracked court
>    labels above — date, area, url [prefer the BAILII/National Archives judgment
>    URL], summary) AND add a matching 3–4 sentence entry to the `caseSummaries`
>    map keyed by the same id. Dedupe by citation/URL against existing `cases`.
>    Skip judgments outside those areas or courts.
> 5. If nothing qualifies, make no change, do not commit, and reply "no new
>    items". Otherwise set `LAST_REVIEWED` in `legal/js/data.js` to today's date.
> 6. Bump the cache-buster so the change goes live — there are FOUR `?v=YYYYMMDD-N`
>    tokens; set ALL FOUR to the SAME today's-date + sequence value (they have
>    drifted out of sync, so unifying them also fixes that): (a) css/styles.css?v=
>    in legal/index.html, (b) js/app.js?v= in legal/index.html, (c) the
>    ./data.js?v= import in legal/js/app.js, (d) the ./charts.js?v= import in
>    legal/js/app.js. e.g. v=20260620-1, incrementing on repeat runs the same day.
> 7. Validate: `node --check legal/js/data.js`.
> 8. Commit with a message ending with these two trailers exactly:
>    `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` and
>    `Claude-Session: <this session's URL>`. Then fast-forward-merge
>    `claude/affectionate-einstein-9hhzga` into `main` and push BOTH branches.
> 9. Reply with a short summary: counts of new items (and any new cases) by area.

---

### Notes

- The `legal` field (general counsel per manager) changes rarely and is not part
  of the routine refresh; refresh it manually if a GC change is reported.
- New `deals`/`intel` `type` values that aren't in `dealTypeClass` /
  `intelTypeClass` (in `credit/js/app.js`) still render, just with default chip
  styling — reuse existing type strings where possible, or add the class.
- The Legal app's `area`, `type` and `firm` values must reuse the existing ids
  (in `practiceAreas`/`updateTypes`/`firms`) — the views look records up by those
  ids, so an unknown value won't render correctly.
