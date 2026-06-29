const CACHE = 'organizer-v4';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('groq.com') || url.hostname.includes('workers.dev')) return;
  if (e.request.mode === 'navigate' || url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c).catch(()=>{})); return res; })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
  }
});

// ── Push empfangen ──
self.addEventListener('push', e => {
  let data = { title: 'Organizer', body: 'Neue Erinnerung' };
  try { if (e.data) data = e.data.json(); } catch (_) { if (e.data) data.body = e.data.text(); }
  const options = {
    body: data.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'organizer',
    renotify: true,
    data: { url: data.url || './' },
    vibrate: [80, 40, 80]
  };
  e.waitUntil(self.registration.showNotification(data.title || 'Organizer', options));
});

// ── Tap auf Notification → App öffnen/fokussieren ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
