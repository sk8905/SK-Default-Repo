# Legal Updates — your personal English-law alerts app

This is a private mobile web app. It pulls client alerts from Magic Circle, US Big Law and UK specialist firms, uses AI to sort them into five practice areas, and shows them on a phone-friendly page you "Add to Home Screen" on your iPhone.

**Practice areas:** Banking & Finance · Restructuring & Insolvency · Corporate · Investment Fund Regulatory · Corporate & Investment Fund Tax.

---

## Setup (one-time, ~20 minutes)

You'll create three accounts, paste some keys into Vercel, click two URLs, and add the icon to your phone. No coding required.

### Step 1 — Sign up for Neon (free database)

1. Go to <https://console.neon.tech> → sign up (Google or email is fine).
2. Create a new project. Region: **EU West (Frankfurt)** is closest to the UK.
3. On the project's home page, find **"Connection string"**. Copy it (starts with `postgresql://…`).
4. Keep this tab open — you'll paste this into Vercel later.

### Step 2 — Sign up for Anthropic (Claude AI)

1. Go to <https://console.anthropic.com> → sign up.
2. Add a payment method. Add ~$5 of credit to start (you'll use ~$3–$5/month).
3. Go to **API Keys** → **Create Key**. Copy the key (starts with `sk-ant-…`).
4. Keep it somewhere safe — Anthropic won't show it again.

### Step 3 — Sign up for Vercel (free hosting)

1. Go to <https://vercel.com/signup> → sign up with your GitHub account.
2. Click **Add New… → Project**.
3. Find this repository (`SK-Default-Repo`) in the list and click **Import**.

### Step 4 — Configure Vercel

On the import screen:

1. **Production Branch:** if it doesn't already say `main`, set it to the branch your app lives on.
2. **Environment Variables** — add these four (copy-paste from steps 1 and 2):

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | Your Neon connection string from step 1 |
   | `ANTHROPIC_API_KEY` | Your Anthropic key from step 2 |
   | `APP_PASSWORD` | A password you'll use to enter the app (make one up) |
   | `CRON_SECRET` | A long random string (make one up — e.g. mash the keyboard) |

3. Click **Deploy**. Wait ~2 minutes for the green tick.
4. Click **Visit** to see the app. You'll see the login page. Don't log in yet.
5. Copy the URL from the address bar — that's your app's address. Something like `legal-updates-xyz.vercel.app`.

### Step 5 — Create the database tables

Open this URL in your browser, replacing the bits in `<>`:

```
https://<YOUR-VERCEL-URL>/api/setup/init-db?secret=<YOUR-CRON_SECRET>
```

You should see `{"ok":true,"message":"Database initialised."}`. If you see `unauthorised`, double-check the `CRON_SECRET` matches what you set in Vercel.

### Step 6 — Pull the last month of legal updates

Open this URL (same pattern):

```
https://<YOUR-VERCEL-URL>/api/ingest/seed?secret=<YOUR-CRON_SECRET>&days=30
```

This takes 3–5 minutes. It walks every firm's RSS feed, asks Claude to classify and summarise each alert, and saves the relevant ones. When it finishes you'll see a JSON report saying how many items were added.

### Step 7 — Check the feeds

Open your app URL, log in with `APP_PASSWORD`, and you should see items in the feed. Tap the bottom-bar tabs to filter by practice area.

If a particular firm seems missing, open this URL (after logging in once):

```
https://<YOUR-VERCEL-URL>/api/debug/feeds
```

It lists each firm and whether their RSS feed worked. For any that show `"ok":false`, the feed URL needs fixing — let me know and I'll update it.

### Step 8 — Add to iPhone home screen

1. On your iPhone, open the app URL in **Safari** (must be Safari, not Chrome).
2. Tap the Share icon (square with up-arrow) at the bottom.
3. Scroll down → **Add to Home Screen** → **Add**.
4. Tap the new icon on your home screen. Enter your password. Done — it now behaves like a native app.

The cron job runs daily at 07:00 UTC and adds new items automatically. Pull down on the feed to refresh.

---

## Cost

- Vercel + Neon: **free**.
- Anthropic API: **~£2–4/month** depending on volume.

## Important caveats

- **AI summaries can be wrong.** The original source link is always shown — verify before relying on it.
- **Some feeds may need fixing.** I've configured 23 firms based on common URL patterns; some will need their real RSS URL substituted in (`/api/debug/feeds` shows you which).
- **Personal use only.** The summaries paraphrase firm publications; don't share or republish.

---

## For the technically curious

Stack: Next.js 14 (App Router) · Tailwind · Neon Postgres + Drizzle ORM · Anthropic SDK (`claude-haiku-4-5`) · Vercel Hobby with daily cron · PWA via manifest + service worker · HMAC-signed cookie auth in edge middleware.

To run locally:

```bash
npm install
cp .env.example .env.local   # fill in env vars
npx drizzle-kit push          # create tables (alternative to /api/setup/init-db)
npm run dev
```

To change the firm list, edit `src/lib/sources.ts` and redeploy.
