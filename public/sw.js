/* TradeQuote offline shell for Pro.
 * SW_VERSION must match lib/offline.ts (SW_VERSION). Bump both on every change so
 * browsers fetch this file (?v=) and delete the previous tradequote-* cache.
 * Documents stay in localStorage. This worker never caches /api/ and holds no secrets.
 */
const SW_VERSION = "tq-offline-1";
const CACHE = "tradequote-" + SW_VERSION;
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/icon-maskable.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        SHELL.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res && res.ok) await cache.put(url, res);
          } catch {
            /* runtime caching fills gaps once the network is back */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("tradequote-") && key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

function cacheable(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname === "/sw.js") return false;
  return true;
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok && res.type === "basic") await cache.put(request, res.clone());
  return res;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok && res.type === "basic") await cache.put(request, res.clone());
    return res;
  } catch {
    const hit = (await cache.match(request)) || (request.mode === "navigate" ? await cache.match(request, { ignoreSearch: true }) : undefined);
    if (hit) return hit;
    if (request.mode === "navigate") {
      const shell = await cache.match("/");
      if (shell) return shell;
    }
    return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!cacheable(request)) return;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/icon")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(networkFirst(request));
});
