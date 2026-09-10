/// <reference lib="webworker" />
// Service Worker der v8-App: Workbox-Precache + Web-Push (Handler 1:1 aus v7, siehe CLAUDE.md §7)
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // Alte v7-Caches (organizer-v4 … organizer-v7.1) entsorgen
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => /^organizer-v\d/.test(k)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
// SPA: Navigationen auf index.html, Worker/Groq bleiben Netzwerk
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/\/__worker/, /workers\.dev/, /groq\.com/] }))

// ── Push empfangen ──
self.addEventListener('push', (e) => {
  let data: { title?: string; body?: string; tag?: string; url?: string } = { title: 'Organizer', body: 'Neue Erinnerung' }
  try {
    if (e.data) data = e.data.json()
  } catch {
    if (e.data) data.body = e.data.text()
  }
  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body: data.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'organizer',
    renotify: true,
    data: { url: data.url || './' },
    vibrate: [80, 40, 80],
  }
  e.waitUntil(self.registration.showNotification(data.title || 'Organizer', options))
})

// ── Tap auf Notification: App öffnen/fokussieren ──
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = (e.notification.data && (e.notification.data as { url?: string }).url) || './'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus()
      if (self.clients.openWindow) return self.clients.openWindow(target)
      return undefined
    }),
  )
})
