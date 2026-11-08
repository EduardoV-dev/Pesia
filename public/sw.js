/**
 * The offline shell for Weight Tracker. It serves cached navigation HTML when
 * the network is gone and asks pages to flush their entry queue when the
 * connection returns (Background Sync on Chromium; the `online` event has iOS
 * covered). The queue itself is owned by the page, never by this worker.
 */
const CACHE_NAME = "weight-tracker-runtime-v1"
const OFFLINE_URL = "/offline"

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }))
      // The offline shell must hydrate with no network, so its chunk graph
      // travels with it: the static script tags embedded in the prerendered
      // document cover the boot bundle.
      const offlineHtml = await (await cache.match(OFFLINE_URL)).text()
      const scriptUrls = [...offlineHtml.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) =>
        new URL(match[1], self.location.origin).toString(),
      )
      await cache.addAll(scriptUrls)
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()

      await Promise.all(
        names.map((name) => (name === CACHE_NAME ? null : caches.delete(name))),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request

  if (request.method !== "GET") {
    return
  }

  const url = new URL(request.url)

  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request)
        } catch {
          // The offline shell rehydrates the last snapshot from IndexedDB.
          const offline = await caches.match(OFFLINE_URL)

          return offline ?? Response.error()
        }
      })(),
    )

    return
  }

  if (url.pathname.startsWith("/_next/") || url.pathname === "/favicon.ico") {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)

        if (cached) {
          return cached
        }

        const response = await fetch(request)

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(request, response.clone())
        }

        return response
      })(),
    )
  }
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "skip-waiting") {
    self.skipWaiting()
  }
})

self.addEventListener("sync", (event) => {
  if (event.tag !== "entry-flush") {
    return
  }

  // shortcut: the page owns the queue, so the nudge is a postMessage — if no
  // window is open the entry stays queued and flushes on next app open,
  // upgrade to a worker-owned queue when offline flushes must run headless.
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      })

      for (const client of clients) {
        client.postMessage({ type: "entry-flush" })
      }
    })(),
  )
})

const DEFAULT_NOTIFICATION = {
  title: "Tu turno de pesada",
  body: "Es tu turno de pesada. Abrí la app para registrarla.",
  tag: "weigh-in-reminder",
}

self.addEventListener("push", (event) => {
  let copy
  try {
    copy = event.data ? event.data.json() : null
  } catch {
    copy = null
  }

  // A malformed or empty payload shows the neutral fallback copy and carries
  // no data anywhere: numbers never reach a notification (G7).
  const title = typeof copy?.title === "string" && copy.title ? copy.title : DEFAULT_NOTIFICATION.title
  const body = typeof copy?.body === "string" && copy.body ? copy.body : DEFAULT_NOTIFICATION.body

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: DEFAULT_NOTIFICATION.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: {},
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      })

      for (const client of windowClients) {
        if ("focus" in client) {
          await client.focus()
          return
        }
      }

      await self.clients.openWindow("/home")
    })(),
  )
})
