# Auto-refresh routine (Claude Routines)

**Two identical routines** keep both Meridian platforms current — one scheduled at
**06:00** and one at **12:00** (Claude Routines runs a single schedule per routine,
so create two routines that both use the prompt below). Each does a **full refresh
of both apps** — Credit (deals, fundraising, mandates/launches, manager website
news, **fund-record reconciliation, new managers/funds, and rotating manager-profile
re-verification**) and Legal (legal alerts, case law, **and restructuring schemes &
plans**). Together they replace the
previous separate Credit-daily, Credit-weekly and Legal-daily routines.

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
- **Historical depth (not just current-year).** The ~24h window only governs
  which *newly surfaced* items a run hunts for — it is NOT a floor on an item's
  own date. A genuine news/deal/intelligence/fund item is in-scope even when it
  predates the current year: backfill historical items dated as far back as
  **2016 (inclusive)** rather than discarding them for being "old" (the dataset
  already spans many years). Never bump or round an item to a recent date to make
  it fit — always record its real publication/event date, verified from the
  source, and dedupe as usual.
- **IDs.** For every array, COMPUTE the current maximum id in the file and use the
  next integer — never trust a number quoted here. Applies to all id series:
  Credit `deals` (d…), `intel` (i…), `managers` (m…), `funds` (f…); Legal `items`
  (u…), `cases` (c…), `restructurings` (rx…). (As at 2026-06-24: Credit deals →
  next d288, intel → next i349, managers → next m113, funds → next f231; Legal
  items → next u563, cases → next c41, restructurings → next rx56.)
- **Editing existing records & adding entities.** Only add a manager/fund or edit a
  fund status/`raised` or a manager's AUM/profile when backed by a verifiable
  public source. Never fabricate: set unknown fields to `null`, mark estimates with
  `estimated: true`, and keep each new/edited record's `sources` pointing to real
  URLs. Reuse existing field names exactly (see a neighbouring record as a template).
- **Sourcing.** Prefer primary/verifiable public sources. Most firm/manager sites
  block automated fetching, so enumerate new article URLs with `site:<domain>` web
  searches and verify dates. Skip data-aggregators (GuruFocus, Tracxn, ZoomInfo,
  Crunchbase, PitchBook, SimplyWall, MarketBeat).
- **Cache-busters.** Each app has FOUR `?v=YYYYMMDD-N` tokens that MUST move in
  lockstep or the browser serves a stale `app.js`:
  - Credit: `css/styles.css?v=` & `js/app.js?v=` in `credit/index.html`; the
    `./data.js?v=` & `./charts.js?v=` imports in `credit/js/app.js`.
  - Legal: the same four under `legal/`.
  **RULE: whenever you change an app's `data.js` at all, you MUST advance that app's
  four tokens to a value not already present in its files (increment the sequence if
  it already shows today's date, else start the day at -1).** Leaving them unchanged
  ships a data change that never goes live (a real bug seen on 2026-06-23 run 2,
  where a credit webNews was added but credit's tokens stayed at -2). Because
  `LAST_CHECKED` changes every run, BOTH apps' tokens move on every run. Before
  committing, `git diff --stat` MUST show `index.html` and `js/app.js` changed for
  every app whose `data.js` changed. The two apps keep independent sequence numbers.
- **Freshness scalars.**
  - Always set `LAST_CHECKED` in BOTH `credit/js/data.js` and `legal/js/data.js`
    to today on EVERY run — this is the "Last refresh" date shown in each topbar,
    so a run is visible even when nothing new was found.
  - Always set `LAST_CHECKED_TIME` (BOTH apps) to the actual run time on EVERY run,
    as a pre-formatted `"HH:MM TZ"` string with a timezone label (London, e.g.
    `"05:22 BST"` / `"12:01 BST"`; use `GMT` in winter). It is pre-formatted (not a
    parsed Date) so it renders identically regardless of the viewer's browser
    timezone. Because two runs land each day (~06:00 and ~12:00), this is what
    tells which run produced the shown data; it appears in the topbar and the
    notification header next to `LAST_CHECKED`. Keep both apps' value identical
    when a single run touches both.
    - **DERIVE it from the clock — never copy a value.** Read the real time with
      `TZ='Europe/London' date '+%H:%M %Z'` and use that. Do NOT reuse the example
      strings above, the previous run's value, or a "06:00"/"12:00" schedule label:
      a manually-triggered run can fire at any time, and a routine fired at 15:41
      must stamp `"15:41 BST"`, not `"06:01 BST"`. (Real bug on 2026-06-24: a run
      executed ~15:41 wrote `LAST_CHECKED_TIME = "06:01 BST"` and titled its commit
      "06:00 BST refresh", so the live site read as though nothing had run since
      06:00 — it looked like the afternoon routine had failed when it had actually
      succeeded.)
    - **Never move it backwards within the same day.** If the file already shows a
      LATER time for today's `LAST_CHECKED` (e.g. a 12:06 run already ran), the new
      value must be ≥ that — a later run must not regress the displayed time.
    - The commit subject's time label, if you use one, MUST match this same real
      time — do not title a 15:41 run "06:00 BST refresh".
  - Only set `DATA_UPDATED` (credit) / `LAST_REVIEWED` (legal) to today when that
    app's actual data changed (new deal/intel/webNews or alert/case).
- **Validate** before committing — and validate as an **ES module**, because the
  apps load `data.js` via `<script type="module">`. Plain `node --check file.js`
  parses in script mode and can PASS on module-only errors (e.g. a missing comma
  between array objects), shipping a blank page. Use an ESM check instead:
  `for f in credit/js/data.js legal/js/data.js; do cp "$f" /tmp/c.mjs && node --check /tmp/c.mjs || echo "FAIL $f"; done`
  — or import-test it: `node --input-type=module -e "import('./legal/js/data.js').then(m=>console.log(m.items.length))"`.
  (A real bug seen 2026-06-24: a `data.js` rewrite dropped the commas between
  `items`; `node --check *.js` passed but the module failed to parse and Legal
  rendered blank.)
- **Publish on every run.** Because `LAST_CHECKED` is bumped each run, every run
  produces a commit (even a "nothing new" run, which just advances `LAST_CHECKED`
  + cache-busters). Commit (message trailers below), then push to `main` AND the
  development branch — pushing to `main` triggers the live redeploy.
- **If the push to `main` fails (`HTTP 503` / "remote end hung up") — API
  fallback.** The static site only redeploys when `main` advances, so a failed
  `main` push means the run did not go live. Pushes to the dev branch can succeed
  while `main` fails (seen after the repo was renamed mid-session, when a session's
  proxy allowlist went stale). Do NOT retry indefinitely — after ~2 attempts with
  backoff, publish to `main` through the **GitHub API** instead (it bypasses the
  git proxy):
  - Push the commit to the dev branch first (that path keeps working).
  - For each file changed this run, call the GitHub MCP `create_or_update_file`
    tool on branch `main` (owner `sk8905`, repo `sk-default-repo` — the API
    follows the rename redirect to `meridian`): supply the file's current blob
    `sha` from `get_file_contents` (ref `refs/heads/main`), the full new content,
    and the same commit message + trailers. A single run usually touches only
    `credit/js/data.js` + `credit/index.html` + `credit/js/app.js` and/or the
    legal equivalents, so this is a handful of calls.
  - Then locally `git fetch origin && git branch -f main origin/main` to resync.
  - Note in the run summary that the API fallback was used (so the stale-allowlist
    session can be flagged/restarted against `sk8905/meridian`).
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
>    - **MIRROR webNews into deals/intel (critical).** A `webNews` entry shows ONLY
>      in the notifications bell — it does NOT appear in the Deal Activity or
>      Fundraising Intelligence feeds, the dashboard KPIs, or any tab/list (those
>      render solely from `deals` / `intel`). So whenever a webNews item is itself a
>      transaction (investment, financing, unitranche, acquisition, disposal/exit,
>      refinancing, restructuring, structured credit/CLO, continuation vehicle) or a
>      capital-formation/strategy event (first/final close, fundraise, launch,
>      mandate, partnership/JV/MoU, senior personnel, strategy), you MUST ALSO add a
>      matching item to `deals` (transactions) or `intel` (everything else) — same
>      date, headline and sourceUrl, with the right `managerId` and a `type` from the
>      existing vocab — so the item appears on the dashboard and in its tab, not just
>      the bell. Only pure manager PR (quarterly/annual results, market commentary,
>      thought-leadership, awards, outlooks) stays webNews-only. Audit: every recent
>      webNews URL should also be a `sourceUrl` in deals/intel unless it is one of
>      those PR-only categories.
>    - **Reconcile fund records** → when a first/final close (or material fund
>      raise) is found, also update the matching fund in the `funds` array: set
>      `status` (Open → "First Close" → "Final Close"), update `raised` (and
>      `hardCap`/`targetSize` if newly disclosed), and refresh its `asOf`. Match the
>      fund by name + managerId; if it doesn't exist yet, add it (next bullet).
>    - **Add new managers / funds** → if a deal or raise involves a manager or fund
>      not yet tracked, add it (only with a verifiable public source; never
>      fabricate — set unknown fields to `null`, mark estimates with
>      `estimated: true`):
>      - New manager → append to `managers` (id `m<next>`): name, hq, founded, aum
>        (€bn number) + aumText, strategies (array), description, asOf, owners,
>        financials, headcount, news: [], sources (≥1 real URL).
>      - New fund → append to `funds` (id `f<next>`): name, managerId, strategy,
>        vintage, targetSize, hardCap, raised, status, domicile, geoFocus,
>        sectorFocus, description, asOf, sources (≥1 real URL).
>    - **Re-verify manager profiles (rotating)** → each run, take the ~3 managers
>      with the OLDEST `asOf`, check their public AUM / headcount / financials /
>      description against a current public source, update any that changed, and set
>      their `asOf` to today (even if unchanged, so the rotation advances). This
>      keeps the slow-moving profile data fresh without re-checking all of them
>      every run.
>    - If Credit's data changed (any of the above), set `DATA_UPDATED` to today.
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
>    - **Schemes & restructuring plans** → search for new English-law Part 26A
>      restructuring plans and Part 26 (distressed) schemes of arrangement that
>      reached the court (convening, sanction, refusal or appeal) in-window. Cover
>      matters since 2020. Good sources: BAILII / National Archives for the
>      judgment, plus the tracked firms' restructuring-team analyses found via
>      `site:<firm-domain>` searches (the same firm list as Legal alerts). Append to
>      the `restructurings` array (id `rx<next>`) using a neighbouring entry as the
>      field template: company, type (`"plan"` or `"scheme"`), date (the hearing/
>      judgment date, YYYY-MM-DD — REQUIRED, see below), court, citation,
>      judgmentUrl, sector, debt, creditors (array), features (array), advisers
>      (array — the company's own legal/financial advisers), firm (a tracked firm id
>      whose article you link), articleUrl (that firm's analysis), outcome (reuse an
>      existing string — e.g. `Sanctioned`, `Refused`, `Convened (meetings ordered)`,
>      `Appeal dismissed — plan upheld`), notes. Set unknown fields to `null`/`[]`;
>      never fabricate creditors, debt figures, advisers or URLs — leave them empty
>      if unverified. Dedupe by company + citation against the existing array.
>    - **Schemes/RPs auto-surface in notifications** (no mirror step needed). Unlike
>      Credit `webNews`, the `restructurings` array already feeds BOTH the
>      Schemes-and-RPs tab AND the notification bell (kind = Plan/Scheme). The ONE
>      requirement: give every new entry a real `date` — that is what sorts it and
>      drives the "new" badge; an entry with no date will not surface as new.
>    - If Legal's data changed, set `LAST_REVIEWED` to today.
>
> 4. ALWAYS set `LAST_CHECKED` to today in BOTH `credit/js/data.js` and
>    `legal/js/data.js` (this is the "Last refresh" date in each topbar — it must
>    advance every run so a run is visible even when nothing was added). Then bump
>    BOTH apps' four cache-buster tokens to today's date with the next sequence.
>
> 5. VALIDATE: `node --check credit/js/data.js` and `node --check legal/js/data.js`.
>
> 6. PUBLISH (every run, even if nothing new): commit — message ending with the two
>    required trailers — then fast-forward-merge
>    `claude/affectionate-einstein-9hhzga` into `main` and push BOTH branches.
>    Pushing to `main` triggers the live redeploy. **If the `main` push fails with
>    `HTTP 503` / "remote end hung up" after ~2 backoff retries, fall back to the
>    GitHub API** (push the dev branch as normal, then use the `create_or_update_file`
>    MCP tool to commit each changed file to `main` — see "API fallback" in the
>    invariants above) and say so in the summary.
>
> 7. Reply with a short summary: counts of new Credit deals / intel / webNews and
>    Legal alerts / cases / schemes & plans (or "no new items — refresh timestamp
>    updated").

---

### Notes

- New `deals`/`intel` `type` values not in `dealTypeClass`/`intelTypeClass`
  (`credit/js/app.js`) still render with default chip styling — reuse existing
  type strings where possible. Legal `area`/`type`/`firm` values MUST reuse the
  existing ids (records are looked up by them).
- Manager `legal` (general counsel) data and the firm/area/tier reference tables
  change rarely and are not part of the refresh.
