// Service Worker Devios v3
const CACHE = 'devios-v3'
const ASSETS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  // Ne pas intercepter les API
  if (e.request.url.includes('/api/')) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Mettre en cache les ressources statiques
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})

// Notifications push
self.addEventListener('push', e => {
  if (!e.data) return
  try {
    const { title, body, url } = e.data.json()
    e.waitUntil(
      self.registration.showNotification(title || 'Devios', {
        body: body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: url || '/' },
        vibrate: [100, 50, 100],
      })
    )
  } catch {}
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/'
  e.waitUntil(clients.openWindow(url))
})
