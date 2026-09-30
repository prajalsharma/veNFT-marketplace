/*
 * Vezo service worker.
 *
 * Its only job is to make the app installable: Chrome will not offer "Install
 * app" without a service worker that has a fetch handler. It deliberately does
 * NOT cache anything.
 *
 * That restraint is the point. Vezo shows live prices, live listings and live
 * chain state, and a cached shell of a trading app is worse than no app at all:
 * a stale price or a sold listing served from cache could cost someone money.
 * Every request goes to the network, exactly as it would without this file.
 */

self.addEventListener("install", () => {
  // Take over immediately rather than waiting for every old tab to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clear anything a previous version of this worker may have cached.
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  // Pass through untouched. Present so the app qualifies as installable.
  event.respondWith(fetch(event.request));
});
