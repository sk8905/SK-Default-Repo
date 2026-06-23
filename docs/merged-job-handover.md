# Merged Meridian job — handover note

Paste the block below into the new merged Meridian job (the one that replaces
the separate *MeridianCredit* and *MeridianLegal* jobs). It is the context/brief
for an interactive maintenance session that owns **both** apps. The scheduled
twice-daily automation lives in the two **routines** (see
[`refresh-routines.md`](./refresh-routines.md)), not here.

---

> **Project: Meridian** — a zero-build static-site intelligence platform, deployed
> on Cloudflare and gated by Cloudflare Access. This single job now owns **both**
> apps (it replaces the separate *MeridianCredit* and *MeridianLegal* jobs):
>
> - **`credit/`** — *Meridian Credit*: European private-credit deals, fundraising,
>   mandates, managers, funds, investors, league, watchlist.
> - **`legal/`** — *Meridian Legal* (Lexalert): English-law legal alerts + BAILII
>   case law.
> - Plus a root sign-in landing page.
>
> **Repo:** `sk8905/meridian` (renamed from `sk-default-repo`; the GitHub/MCP API
> still resolves the old name via redirect). **Develop on branch
> `claude/affectionate-einstein-9hhzga`; the site deploys from `main`** (Cloudflare
> redeploys on every push to `main`).
>
> **Architecture (per app):** `index.html` + `css/styles.css` + `js/data.js` (all
> data, ES-module exports) + `js/app.js` (hash router + views) + `js/charts.js`
> (inline SVG). No framework, no build step, no runtime API. The Worker
> (`wrangler.jsonc`, `src/index.js`) serves the repo root and handles
> `/api/watchlist`, `/api/me`, `/api/login`.
>
> **The recurring task** is the twice-daily full refresh of both apps.
> **`docs/refresh-routines.md` is the single source of truth** — follow its
> Invariants and "routine prompt" verbatim. Key rules it encodes:
> - Sync from `main` first; only add items published since the last run (~24h
>   look-back, dedup by URL/headline/citation); never fabricate data, URLs, dates,
>   figures or quotes; unknowns = `null`, estimates = `estimated:true`.
> - Compute the next id from the file for every array (`d/i/m/f` credit, `u/c`
>   legal) — never trust a quoted number.
> - **Cache-busters:** whenever an app's `data.js` changes you MUST advance that
>   app's four `?v=` tokens, or the change ships invisibly.
> - **Freshness scalars:** set `LAST_CHECKED` (both apps) every run; set
>   `DATA_UPDATED` (credit) / `LAST_REVIEWED` (legal) only when that app's data
>   actually changed.
> - Validate (`node --check`), then **publish on every run** by committing (with
>   the two mandatory trailers) and pushing to **both** the dev branch and `main`.
> - **If the `main` push fails with `HTTP 503` / "remote end hung up"** (a
>   stale-allowlist symptom), don't retry indefinitely — publish to `main` via the
>   GitHub MCP `create_or_update_file` tool (owner `sk8905`, repo
>   `sk-default-repo`, branch `main`, supplying each file's current blob `sha`),
>   then resync, and note it in the summary.
>
> **Setup/deploy reference:** `docs/cloudflare-setup.md`. **Scope/sourcing
> reference:** `docs/auto-refresh-scope.md` and `docs/research-notes.md`.
>
> **Commit trailers (mandatory) on every commit:**
> ```
> Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
> Claude-Session: <this session's URL>
> ```
> Do **not** put model IDs in commits, code, or any pushed artifact.

---

## Doing the merge (operator checklist)

- **Delete the two old jobs** (MeridianCredit, MeridianLegal) once this merged job
  exists — otherwise all three run and produce duplicate/competing commits.
- **Keep the two scheduled routines (06:00 + 12:00) separate from this job.**
  Claude Routines runs one schedule per routine, so the automation stays as two
  routines that both paste the "routine prompt" from `refresh-routines.md`. This
  merged *job* is the interactive/maintenance session; the *routines* are the
  scheduled automation.
- **Point the new job and both routines at `sk8905/meridian`** so they get a fresh
  proxy allowlist and can push to `main` directly (avoiding the 503 API-fallback
  this had to use right after the rename).

## Do the existing routine instructions need editing?

- **Target repo (configuration):** **Yes** — repoint each routine to
  `sk8905/meridian`. This is the routine's repo setting, not its prompt text.
- **Prompt text:** **Not strictly required.** The pasted prompt already says
  "Follow the invariants in `docs/refresh-routines.md`", and that doc now contains
  the API-push fallback, so a run picks it up at runtime. **Recommended anyway:**
  re-paste the current "routine prompt" from `refresh-routines.md` once, so the
  inline publish step (step 6) also reflects the fallback and the two copies don't
  drift. Nothing else in the prompt depends on the old repo name (it references the
  dev branch and the docs, both unchanged).
