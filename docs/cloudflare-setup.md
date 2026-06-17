# Cloudflare setup — login, access control & cross-device watchlist

This makes the platform **private to you only** and lets your **watchlist sync
across devices**, all on Cloudflare's free tier. You do the dashboard clicks
below; all the code is already in the repo (`functions/api/watchlist.js` plus the
sync logic in `js/app.js`).

How it fits together:

- **Cloudflare Pages** hosts the static site (this repo).
- **Cloudflare Access** sits in front of the whole site and only lets *your*
  identity in — everyone else is blocked before they can load the app or the
  data files. This replaces GitHub Pages (which is public to the world).
- **A Pages Function + KV** (`/api/watchlist`) stores your watchlist keyed to
  your verified identity, so it's the same on every device.

---

## 1. Create the Pages project (connect this repo)

1. Go to <https://dash.cloudflare.com> → sign up / log in (free).
2. **Workers & Pages → Create → Pages → Connect to Git**.
3. Authorise GitHub and pick the **`sk8905/SK-Default-Repo`** repository.
4. Build settings:
   - **Production branch:** `claude/affectionate-einstein-9hhzga` (or merge to
     `main` and use that — your choice).
   - **Framework preset:** None.
   - **Build command:** *(leave blank)*.
   - **Build output directory:** `/`
5. **Save and Deploy.** You'll get a URL like `https://<project>.pages.dev`.

## 2. Create the KV namespace and bind it

1. **Workers & Pages → KV → Create a namespace**, name it e.g. `meridian-watchlist`.
2. Open your **Pages project → Settings → Functions → KV namespace bindings →
   Add binding**:
   - **Variable name:** `WATCHLIST`  ← must be exactly this.
   - **KV namespace:** the one you just created.
3. Add it for **Production** (and Preview if you want). Re-deploy if prompted.

> The binding name `WATCHLIST` is what `functions/api/watchlist.js` reads as
> `context.env.WATCHLIST`.

## 3. Lock the site to just you (Cloudflare Access)

1. In the dashboard go to **Zero Trust** (set up a free team name if asked).
2. **Access → Applications → Add an application → Self-hosted.**
   - **Application name:** Meridian.
   - **Session duration:** your choice (e.g. 1 month).
   - **Application domain:** your `*.pages.dev` host (and your custom domain too
     if you add one).
3. **Add a policy:**
   - **Policy name:** Owner only.
   - **Action:** Allow.
   - **Include → Emails →** *your email address*. (This is the "only I have a
     profile" rule — only this email can ever get in.)
4. **Login methods:** the default **One-time PIN** (emailed code) works with no
   extra setup. You can also enable Google/GitHub login if you prefer.
5. Save. Now visiting the site shows a Cloudflare login screen; only your email
   can pass, and the watchlist's `/api/watchlist` calls are authenticated
   automatically.

## 4. Turn off the public GitHub Pages site

So the data isn't still public elsewhere:

- GitHub repo → **Settings → Pages → Source → None** (disable), **or** stop
  deploying to the Pages branch. From now on, use the Cloudflare URL.

## 5. (Optional) Custom domain

Pages project → **Custom domains → Set up a domain** (e.g. `app.yourdomain.com`).
Then add that same hostname to the Access application (step 3.2) so it's gated too.

---

## How sign-in / sign-out works day to day

- Visit the site → Cloudflare asks for your email → you get a one-time PIN (or use
  Google/GitHub) → you're in for the session length you set.
- The **Watchlist** page shows "☁ Synced … signed in as <you>" and a **Sign out**
  link (it points to `/cdn-cgi/access/logout`).
- Star any manager/fund/investor on any device — it appears on all your devices.

## Notes & safety

- No password is stored in the repo; identity is handled entirely by Cloudflare
  Access. Even though this repo is public, there's no secret to leak.
- If the app is ever opened **not** behind Cloudflare (e.g. local file or the old
  GitHub Pages copy), it silently falls back to a **device-local** watchlist and
  shows "Saved on this device only" — it won't error.
- Everything above is within Cloudflare's free tier for a single user.
