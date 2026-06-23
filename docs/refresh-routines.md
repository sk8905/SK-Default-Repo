# Auto-refresh routine (Claude Routines)

**Two identical routines** keep both Meridian platforms current — one scheduled at
**06:00** and one at **12:00** (Claude Routines runs a single schedule per routine,
so create two routines that both use the prompt below). Each does a **full refresh
of both apps** — Credit (deals, fundraising, mandates/launches, manager website
news) and Legal (legal alerts and case law). Together they replace the previous
separate Credit-daily, Credit-weekly and Legal-daily routines.

Keep this file in sync with the routine prompt pasted into the Routines UI — it is
the source of truth for the prompt.

> **Repo structure.** The repo is split into a root sign-in landing page +
> **`credit/`** (Meridian Credit) + **`legal/`** (Meridian Legal). Each app keeps
> its data and assets under its own folder and the site deploys from the **`main`**
> branch (Cloudflare redeploys on every push to `main`).

## Invariants

- **Sync first.** Always start from the latest `main`: `git fetch origin`, then
  `git checkout -B claude/affectionate-einstein-9hhzga origin/main`.
- **Window.** Add items published since the last run. The two runs are ~6h
  (06:00→12:00) and ~18h (12:00→06:00) apart, so look back ~24 hours to be safe —
  dedup removes any overlap. Verify each item's EXACT publication date from the
  source; never invent a URL, date, figure or quote. Dedupe every candidate by URL
  and normalised headline/citation against the data already in the file.
- **IDs.** For every array, COMPUTE the current maximum id in the file and use the
  next integer — never trust a number quoted here. (As at 2026-06-23: Credit deals
  → next d260, Credit intel → next i325; Legal items → next u135, Legal cases →
  next c38.)
- **Sourcing.** Prefer primary/verifiable public sources. Most firm/manager sites
  block automated fetching, so enumerate new article URLs with `site:<domain>` web
  searches and verify dates. Skip data-aggregators (GuruFocus, Tracxn, ZoomInfo,
  Crunchbase, PitchBook, SimplyWall, MarketBeat).
- **Cache-busters.** Each app has FOUR `?v=YYYYMMDD-N` tokens that MUST move in
  lockstep or the browser serves a stale `app.js`:
  - Credit: `css/styles.css?v=` & `js/app.js?v=` in `credit/index.html`; the
    `./data.js?v=` & `./charts.js?v=` imports in `credit/js/app.js`.
  - Legal: the same four under `legal/`.
  Bump only an app's four tokens if you changed that app, to today's date with the
  next sequence (if they already show today's date, increment; else start at 1).
  The two apps keep independent sequence numbers.
- **Freshness scalars.** Set `DATA_UPDATED` in `credit/js/data.js` and
  `LAST_REVIEWED` in `legal/js/data.js` to today when that app changes.
- **Validate** before committing: `node --check credit/js/data.js` and
  `node --check legal/js/data.js`.
- **Publish.** Commit (message trailers below), then push to `main` AND the
  development branch — pushing to `main` triggers the live redeploy.
- If a platform has nothing new, leave it untouched (don't bump its cache-busters);
  if neither has anything new, make no commit and report "no new items".
- **Commit message** ends with:
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  Claude-Session: <this session's URL>
  ```

---

## The routine prompt

> Do a full refresh of BOTH Meridian platforms — Credit and Legal — and publish
> the changes live. (This routine runs twice a day, at 06:00 and 12:00.) Follow the
> invariants in `docs/refresh-routines.md`. The repo has `credit/` and `legal/`
> apps and deploys from `main`.
>
> 1. SYNC: `git fetch origin`, then
>    `git checkout -B claude/affectionate-einstein-9hhzga origin/main`. Do all work
>    on this branch. Add only items published since the last run (look back ~24h;
>    dedup removes overlap). Verify every date from the source; never invent URLs, dates,
>    figures or quotes; dedupe against what's already in each file. For every array
>    compute the current max id and use the next integer.
>
> 2. CREDIT — `credit/js/data.js` (European private credit):
>    - **Deals** → append to the `deals` array (id `d<next>`): date (YYYY-MM-DD),
>      managerId (must match an existing manager — skip if not in the dataset),
>      fundId if applicable, type (reuse an existing deal type), headline, summary,
>      sourceUrl.
>    - **Fundraising / mandates / launches** → append to the `intel` array (id
>      `i<next>`): date, type (reuse an existing intel type — Fundraising, First
>      Close, Final Close, Launch, Mandate, Personnel, Strategy, Equity / PE),
>      headline, summary, managerId/fundId, sourceUrl. (Mandates & fund launches
>      are intel items of type "Mandate"/"Launch" — they feed the Mandates tab.)
>    - **Manager website news** → for managers with an active news/press page, add
>      new announcements to that manager's `webNews` array ({date, outlet, title,
>      url}), deduped against their existing `news` + `webNews`; prefer the
>      manager's own press-release URL.
>    - If anything changed: set `DATA_UPDATED` to today and bump Credit's four
>      cache-busters.
>
> 3. LEGAL — `legal/js/data.js` (English law). Cover the five practice areas only:
>    banking, ri, corporate, fundsreg, fundtax.
>    - **Legal alerts** → append to the `items` array (id `u<next>`) from the
>      tracked firms'/chambers' own insights/client-alert pages: title; area (one
>      of the five); areas (array); type (one of case/update/alert/insight/
>      knowhow); firm (MUST be one of: aoshearman, cliffordchance, freshfields,
>      linklaters, slaughtermay, ashurst, hsf, macfarlanes, traverssmith, simmons,
>      latham, kirkland, whitecase, weil, sidley, cleary, ropesgray,
>      simpsonthacher, davispolk, southsquare — skip items not from these);
>      date; jurisdiction; court + citation for case notes; summary; points
>      (array); tags (array); url.
>    - **Case law** → search BAILII and caselaw.nationalarchives.gov.uk for
>      judgments handed down in-window in the five areas AND one of the tracked
>      courts ONLY (Supreme Court, Court of Appeal, High Court (Ch), High Court
>      (Comm), High Court (KB), High Court (QB)). Append to the `cases` array (id
>      `c<next>`): id, name, citation, court (exactly one tracked label), date,
>      area, url (prefer the BAILII/National Archives URL), summary — AND add a
>      matching 3–4 sentence entry to the `caseSummaries` map keyed by the same id.
>    - If anything changed: set `LAST_REVIEWED` to today and bump Legal's four
>      cache-busters.
>
> 4. VALIDATE: `node --check credit/js/data.js` and `node --check legal/js/data.js`.
>
> 5. PUBLISH: if nothing qualified in either app, make no commit and reply "no new
>    items". Otherwise commit (message ending with the two required trailers),
>    fast-forward-merge `claude/affectionate-einstein-9hhzga` into `main`, and push
>    BOTH branches. Pushing to `main` triggers the live redeploy.
>
> 6. Reply with a short summary: counts of new Credit deals / intel / webNews and
>    Legal alerts / cases.

---

### Notes

- New `deals`/`intel` `type` values not in `dealTypeClass`/`intelTypeClass`
  (`credit/js/app.js`) still render with default chip styling — reuse existing
  type strings where possible. Legal `area`/`type`/`firm` values MUST reuse the
  existing ids (records are looked up by them).
- Manager `legal` (general counsel) data and the firm/area/tier reference tables
  change rarely and are not part of the refresh.
