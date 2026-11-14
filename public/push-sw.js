// Pushmeldingen: wordt door de service worker van Stuurhut ingeladen (workbox importScripts).
self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} }
  catch { d = { body: event.data ? event.data.text() : '' } }
  event.waitUntil(self.registration.showNotification(d.title || 'Stuurhut', {
    body: d.body || '',
    tag: d.tag,
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    data: { url: d.url || '/' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil((async () => {
    const vensters = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of vensters) {
      if (new URL(c.url).origin === self.location.origin) {
        await c.focus()
        if ('navigate' in c) await c.navigate(url)
        return
      }
    }
    await self.clients.openWindow(url)
  })())
})
