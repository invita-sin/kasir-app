const CACHE_NAME = "kasir-cache-v1";
const API_CACHE = "kasir-api-cache-v1";
const STATIC_ASSETS = ["/", "/login"];

self.addEventListener("install", () => self.skipWaiting());

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
    return event.respondWith(handleApiGet(request, url));
  }

  event.respondWith(cacheFirst(request));
});

const CRITICAL_API_PATHS = ["/api/products", "/api/cabang", "/api/dashboard"];

async function handleApiGet(request, url) {
  if (CRITICAL_API_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(p + "?"))) {
    return staleWhileRevalidate(request);
  }
  return networkFirstWithCache(request);
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request.clone()).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch((err) => { console.error("[SW] fetch failed:", err); return null; });

  if (cached) {
    return cached;
  }

  const response = await fetchPromise;
  return response || new Response(JSON.stringify({ error: "Tidak ada koneksi", code: "OFFLINE" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

async function networkFirstWithCache(request) {
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

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request.clone());
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return caches.match("/");
  }
}

async function checkLowStock() {
  try {
    const response = await fetch("/api/dashboard");
    const data = await response.json();
    const products = data.lowStockProducts || data.low_stock_products || [];
    if (products.length > 0) {
      const title = `Stok Rendah (${products.length})`;
      const body = products
        .slice(0, 5)
        .map((p) => `${p.name || p.nama}: ${p.stock || p.stok}`)
        .join("\n");
      self.registration.showNotification(title, {
        body: products.length > 5 ? `${body}\n...dan ${products.length - 5} lainnya` : body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "low-stock",
        renotify: true,
      });
    }
  } catch (err) {
    console.error("[SW] checkLowStock error:", err);
  }
}

self.addEventListener("message", (event) => {
  if (event.data === "CHECK_LOW_STOCK") {
    event.waitUntil(checkLowStock());
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-low-stock") {
    event.waitUntil(checkLowStock());
  }
});
