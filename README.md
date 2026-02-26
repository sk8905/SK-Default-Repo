# Market Pulse — Daily Push Notifications

A lightweight Node.js application that delivers **daily push notifications** with the latest data for major global market indices, straight to your browser — even when it's closed.

## Indices tracked

| Flag | Index       | Symbol  |
|------|-------------|---------|
| 🇺🇸 | S&P 500     | ^GSPC   |
| 🇺🇸 | NASDAQ      | ^IXIC   |
| 🇺🇸 | Dow Jones   | ^DJI    |
| 🇬🇧 | FTSE 100    | ^FTSE   |
| 🇯🇵 | Nikkei 225  | ^N225   |
| 🇩🇪 | DAX         | ^GDAXI  |
| 🇭🇰 | Hang Seng   | ^HSI    |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      server.js                          │
│                                                         │
│  Express API ──► REST endpoints for subscribe / data    │
│  node-cron   ──► Daily job at 9:00 AM UTC (Mon–Fri)     │
│  web-push    ──► Sends Web Push to all subscribers      │
│  Yahoo Finance ► Live quote data (no API key needed)    │
└─────────────────────────────────────────────────────────┘
        │
        ▼  push event
┌───────────────────────┐        ┌──────────────────────┐
│  service-worker.js    │◄──────►│  public/index.html   │
│  (browser background) │        │  dashboard:          │
│  Shows notification   │        │  subscribe / view    │
└───────────────────────┘        └──────────────────────┘
```

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Generate VAPID keys

Web Push requires a key pair. Generate one with:

```bash
npm run generate-vapid
```

Copy the output into a `.env` file:

```bash
cp .env.example .env
# then paste the generated keys into .env
```

### 3. Start the server

```bash
# production
npm start

# development (auto-restarts on file changes, requires Node 18+)
npm run dev
```

Open **http://localhost:3000** in your browser.

### 4. Subscribe

1. Click **Subscribe** on the dashboard.
2. Allow notifications when the browser prompts.
3. Use **Send Test Notification** to verify everything works.

The daily job runs automatically every weekday morning at **9:00 AM UTC**.

## Configuration

| Variable           | Default              | Description                              |
|--------------------|----------------------|------------------------------------------|
| `VAPID_PUBLIC_KEY` | *(required)*         | VAPID public key                         |
| `VAPID_PRIVATE_KEY`| *(required)*         | VAPID private key                        |
| `VAPID_EMAIL`      | `admin@example.com`  | Contact email embedded in push requests  |
| `PORT`             | `3000`               | HTTP server port                         |
| `CRON_SCHEDULE`    | `0 9 * * 1-5`        | Cron expression for daily notification   |
| `CRON_TIMEZONE`    | `UTC`                | Timezone for the cron job                |

## API reference

| Method | Endpoint                | Description                             |
|--------|-------------------------|-----------------------------------------|
| GET    | `/api/vapid-public-key` | Returns VAPID public key                |
| GET    | `/api/market-data`      | Returns live quote data for all indices |
| POST   | `/api/subscribe`        | Registers a push subscription           |
| POST   | `/api/unsubscribe`      | Removes a push subscription             |
| POST   | `/api/send-now`         | Manually triggers the notification      |
| GET    | `/api/subscribers`      | Returns current subscriber count        |

## Production notes

- **Subscription storage** — subscriptions are kept in-memory by default. Replace the `Map` in `server.js` with a database (e.g. SQLite, PostgreSQL) for persistence across restarts.
- **HTTPS** — Web Push and service workers require HTTPS in production. Use a reverse proxy (nginx, Caddy) or a platform like Railway / Render.
- **Market hours** — adjust `CRON_SCHEDULE` and `CRON_TIMEZONE` to fire at the right time for your audience (e.g. US Eastern open is 14:30 UTC).

## Data source

Market data is fetched from the **Yahoo Finance** public quote API — no API key or account required.
