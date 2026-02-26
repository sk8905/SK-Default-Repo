require('dotenv').config();
const express = require('express');
const webpush = require('web-push');
const cron = require('node-cron');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// VAPID configuration
// Run `npm run generate-vapid` to create keys, then add them to your .env
// ---------------------------------------------------------------------------
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL = 'admin@example.com' } = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn(
    'WARNING: VAPID keys not set. Push notifications will not work.\n' +
    'Run `npm run generate-vapid` to generate keys and add them to .env'
  );
} else {
  webpush.setVapidDetails(`mailto:${VAPID_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ---------------------------------------------------------------------------
// Market indices to track
// ---------------------------------------------------------------------------
const INDICES = [
  { symbol: '%5EGSPC',  name: 'S&P 500',    flag: '🇺🇸' },
  { symbol: '%5EIXIC',  name: 'NASDAQ',      flag: '🇺🇸' },
  { symbol: '%5EDJI',   name: 'Dow Jones',   flag: '🇺🇸' },
  { symbol: '%5EFTSE',  name: 'FTSE 100',    flag: '🇬🇧' },
  { symbol: '%5EN225',  name: 'Nikkei 225',  flag: '🇯🇵' },
  { symbol: '%5EGDAXI', name: 'DAX',         flag: '🇩🇪' },
  { symbol: '%5EHSI',   name: 'Hang Seng',   flag: '🇭🇰' },
];

// ---------------------------------------------------------------------------
// Subscription store (in-memory; swap for a database in production)
// ---------------------------------------------------------------------------
const subscriptions = new Map();

// ---------------------------------------------------------------------------
// Market data fetching
// ---------------------------------------------------------------------------
async function fetchMarketData() {
  const symbolList = INDICES.map((i) => i.symbol).join('%2C');
  const url =
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolList}` +
    `&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,shortName`;

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; MarketNotificationBot/1.0)',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance returned HTTP ${response.status}`);
  }

  const json = await response.json();
  const quotes = json?.quoteResponse?.result ?? [];

  return INDICES.map((idx) => {
    const decoded = decodeURIComponent(idx.symbol);
    const q = quotes.find((r) => r.symbol === decoded) ?? {};
    return {
      symbol: decoded,
      name: idx.name,
      flag: idx.flag,
      price: q.regularMarketPrice ?? null,
      change: q.regularMarketChange ?? null,
      changePercent: q.regularMarketChangePercent ?? null,
      previousClose: q.regularMarketPreviousClose ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Notification payload formatter
// ---------------------------------------------------------------------------
function buildPayload(marketData) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const lines = marketData.map(({ flag, name, price, changePercent }) => {
    if (price === null) return `${flag} ${name}: N/A`;
    const arrow = changePercent >= 0 ? '▲' : '▼';
    const pct = Math.abs(changePercent).toFixed(2);
    const priceStr = price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return `${flag} ${name}: ${priceStr}  ${arrow} ${pct}%`;
  });

  const advancing = marketData.filter((m) => (m.changePercent ?? 0) >= 0).length;
  const declining = marketData.length - advancing;
  const mood = advancing >= declining ? '📈 Markets mostly advancing' : '📉 Markets mostly declining';

  return {
    title: `Daily Market Update — ${date}`,
    body: lines.join('\n'),
    mood,
    timestamp: Date.now(),
    marketData,
  };
}

// ---------------------------------------------------------------------------
// Send push notifications to all subscribers
// ---------------------------------------------------------------------------
async function sendNotifications(payload) {
  const results = await Promise.allSettled(
    Array.from(subscriptions.values()).map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or invalid — remove it
          subscriptions.delete(sub.endpoint);
          console.log(`Removed stale subscription: ${sub.endpoint.slice(-20)}`);
        } else {
          throw err;
        }
      }
    })
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  console.log(
    `Notifications sent: ${results.length - failed} succeeded, ${failed} failed. ` +
    `Active subscriptions: ${subscriptions.size}`
  );
}

// ---------------------------------------------------------------------------
// Core daily job
// ---------------------------------------------------------------------------
async function runDailyMarketUpdate() {
  console.log(`[${new Date().toISOString()}] Running daily market update…`);
  try {
    const marketData = await fetchMarketData();
    const payload = buildPayload(marketData);

    if (subscriptions.size > 0) {
      await sendNotifications(payload);
    } else {
      console.log('No subscribers — skipping push notifications.');
    }

    return payload;
  } catch (err) {
    console.error('Daily market update failed:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Cron schedule: 9:00 AM UTC, Monday–Friday
// Adjust the timezone to match your audience's market open.
// ---------------------------------------------------------------------------
const SCHEDULE = process.env.CRON_SCHEDULE ?? '0 9 * * 1-5';
const TIMEZONE = process.env.CRON_TIMEZONE ?? 'UTC';

cron.schedule(SCHEDULE, runDailyMarketUpdate, { timezone: TIMEZONE });
console.log(`Cron scheduled: "${SCHEDULE}" (${TIMEZONE})`);

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

// Serve VAPID public key so the frontend can subscribe
app.get('/api/vapid-public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: 'VAPID keys not configured on the server.' });
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Register a push subscription
app.post('/api/subscribe', (req, res) => {
  const subscription = req.body;
  if (!subscription?.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object.' });
  }
  subscriptions.set(subscription.endpoint, subscription);
  console.log(`New subscriber. Total: ${subscriptions.size}`);
  res.status(201).json({ message: 'Subscribed successfully.' });
});

// Remove a push subscription
app.post('/api/unsubscribe', (req, res) => {
  const { endpoint } = req.body ?? {};
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint.' });
  subscriptions.delete(endpoint);
  console.log(`Unsubscribed. Total: ${subscriptions.size}`);
  res.json({ message: 'Unsubscribed successfully.' });
});

// Live market data (no notification sent)
app.get('/api/market-data', async (req, res) => {
  try {
    const data = await fetchMarketData();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Manually trigger a notification (useful for testing)
app.post('/api/send-now', async (req, res) => {
  try {
    const payload = await runDailyMarketUpdate();
    res.json({ message: 'Notification dispatched.', payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subscriber count (diagnostics)
app.get('/api/subscribers', (req, res) => {
  res.json({ count: subscriptions.size });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Market notification server listening on http://localhost:${PORT}`);
});
