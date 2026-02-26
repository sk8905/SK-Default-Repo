// ---------------------------------------------------------------------------
// Service Worker — handles incoming push notifications and click events
// ---------------------------------------------------------------------------

const NOTIFICATION_TAG = 'daily-market-update';

// ---------------------------------------------------------------------------
// Push event: show a rich notification
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Market Update', body: event.data?.text() ?? '' };
  }

  const title = payload.title ?? 'Daily Market Update';
  const options = {
    body: payload.body ?? 'Tap to view the latest market data.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: NOTIFICATION_TAG,
    renotify: true,
    requireInteraction: false,
    timestamp: payload.timestamp ?? Date.now(),
    data: {
      url: '/',
      marketData: payload.marketData ?? [],
      mood: payload.mood ?? '',
    },
    actions: [
      { action: 'view',    title: '📊 View Dashboard' },
      { action: 'dismiss', title: '✕ Dismiss'          },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ---------------------------------------------------------------------------
// Notification click: open / focus the app window
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If the app is already open, focus it
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ---------------------------------------------------------------------------
// Install & activate: take control immediately (no caching in this SW)
// ---------------------------------------------------------------------------
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
