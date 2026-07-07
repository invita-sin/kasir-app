const CACHE_NAME = "kasir-cache-v1";
const API_CACHE = "kasir-api-cache-v1";
const STATIC_ASSETS = ["/", "/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.method === "GET" && url.pathname.startsWith("/api/")) {
    return event.respondWith(handleApiGet(request));
  }

  event.respondWith(networkFirstWithCache(request));
});

async function handleApiGet(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  try {
    const response = await fetch(request.clone());
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "Tidak ada koneksi", code: "OFFLINE" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request.clone());
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return caches.match("/");
  }
}
