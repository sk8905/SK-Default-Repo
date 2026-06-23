# Little Steps — baby development tracker

A private, offline-first, **zero-build** single-page app to track a baby's
development, sleep, feeding, milk, weaning/allergens, growth, vaccinations,
health checks and the nursery/school timeline — grounded in **UK (NHS/UKHSA),
Irish (HSE) and French (ameli/sante.gouv)** guidance.

This repository is a **standalone deployment** of the app: it is completely
independent — no shared code, auth, or links with any other project. The whole
app is the single file [`index.html`](index.html). All data stays in the
browser (`localStorage`); there is JSON export/import for backup.

## Run it

- **Locally:** double-click `index.html` — works fully offline.
- **Hosted:** see Cloudflare Pages steps below (recommended for a private repo),
  or any static host.

## Deploy on Cloudflare Pages (recommended) + your own login

> This is **separate** from any other site — its own project, its own login.

### 1. Create the Pages project
1. <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages →
   Connect to Git**.
2. Authorise GitHub and pick this repository
   (`sk8905/little-steps-baby-tracker`).
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/`
4. **Save and Deploy** → you get a URL like
   `https://little-steps-baby-tracker.pages.dev`.

### 2. Lock it to just you (Cloudflare Access — a NEW, separate application)
1. Dashboard → **Zero Trust** (free; set a team name if asked).
2. **Access → Applications → Add an application → Self-hosted.**
   - **Name:** Little Steps
   - **Application domain:** your `*.pages.dev` host (and a custom domain if you
     add one).
3. **Add a policy:** Action **Allow**, Include → **Emails** → your email (add
   your partner's too). This is its **own** policy, unrelated to any other app.
4. **Login method:** default **One-time PIN** (emailed code) needs no setup;
   Google/GitHub login optional.
5. Save. Now the site shows a login screen and only your listed emails can enter.

### 3. (Optional) Custom domain
Pages project → **Custom domains** → add e.g. `littlesteps.yourdomain.com`, then
add that hostname to the Access application above so it's gated too.

## Not medical advice

Ages, doses and schedules are general guides from public sources and change over
time. Always follow your GP, health visitor, PHN or paediatrician, and your Red
Book / carnet de santé. Schedules were checked against official sources around
June 2026 — re-verify before acting on dates.
