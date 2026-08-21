self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [500, 250, 500, 250, 500],
      tag: 'p2h-notification-' + Date.now(),
      renotify: true,
      requireInteraction: true,
      silent: false,
      data: {
        url: data.url || '/'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options).then(() => {
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'PUSH_RECEIVED', data: data }));
      })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// Pass all requests through to the network - no caching
self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});


self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});
