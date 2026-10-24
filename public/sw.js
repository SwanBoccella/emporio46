/*
 * Service worker — Emporio 46
 *
 * Unico scopo: quando l'utente apre il sito senza connessione, mostrare
 * /offline.html al posto della pagina d'errore del browser.
 * Non mette in cache il resto del sito, quindi non può servire contenuti vecchi.
 *
 * Per forzare l'aggiornamento della pagina offline, incrementare VERSION.
 */
const VERSION = 'v1'
const OFFLINE_CACHE = `mnt-offline-${VERSION}`
const FONT_CACHE = 'mnt-fonts-v1'
const OFFLINE_URL = '/offline.html'
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const res = await fetch(OFFLINE_URL, { cache: 'reload' })
    const html = res.ok ? await res.text() : ''
    // Evita di salvare per errore l'index.html servito dalla regola SPA
    if (!html.includes('data-mnt-offline')) throw new Error('offline.html non trovato')
    const cache = await caches.open(OFFLINE_CACHE)
    await cache.put(OFFLINE_URL, new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }))
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((k) => k.startsWith('mnt-offline-') && k !== OFFLINE_CACHE)
        .map((k) => caches.delete(k))
    )
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Navigazioni (apertura sito, ricarica, link diretti): rete, altrimenti pagina offline
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(request)
      } catch {
        const cache = await caches.open(OFFLINE_CACHE)
        return (await cache.match(OFFLINE_URL)) || Response.error()
      }
    })())
    return
  }

  // Font Google: stale-while-revalidate, così la pagina offline usa i font del sito
  const url = new URL(request.url)
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(FONT_CACHE)
      const cached = await cache.match(request, { ignoreVary: true })
      const network = fetch(request)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone())
          return res
        })
        .catch(() => undefined)
      if (cached) {
        event.waitUntil(network)
        return cached
      }
      return (await network) || Response.error()
    })())
  }
})
