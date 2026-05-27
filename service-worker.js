const CACHE_NAME = "middagsplan-v87";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./src/domain/meals.js",
  "./src/domain/shopping.js",
  "./src/domain/suggestions.js",
  "./src/domain/weeks.js",
  "./src/render/calendar.js",
  "./src/render/meals.js",
  "./src/render/planner.js",
  "./src/render/setup.js",
  "./src/render/shopping.js",
  "./src/sync/firebase.js",
  "./src/sync/reads.js",
  "./src/sync/state.js",
  "./src/sync/writes.js",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

const NETWORK_FIRST_ASSETS = [
  "/",
  "index.html",
  "styles.css",
  "app.js",
  "src/domain/meals.js",
  "src/domain/shopping.js",
  "src/domain/suggestions.js",
  "src/domain/weeks.js",
  "src/render/calendar.js",
  "src/render/meals.js",
  "src/render/planner.js",
  "src/render/setup.js",
  "src/render/shopping.js",
  "src/sync/firebase.js",
  "src/sync/reads.js",
  "src/sync/state.js",
  "src/sync/writes.js",
  "manifest.json",
  "service-worker.js",
];

function normalizedPath(url) {
  const path = new URL(url).pathname;
  return path.endsWith("/") ? "/" : path;
}

function shouldHandleRequest(request) {
  const url = new URL(request.url);
  return request.method === "GET" && url.origin === self.location.origin && ["http:", "https:"].includes(url.protocol);
}

function isNetworkFirstAsset(url) {
  const path = normalizedPath(url);
  return NETWORK_FIRST_ASSETS.some((asset) => path === asset || path.endsWith(`/${asset}`));
}

function cacheResponse(request, response) {
  if (!response || !response.ok) return response;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (!shouldHandleRequest(event.request)) return;

  if (isNetworkFirstAsset(event.request.url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => cacheResponse(event.request, response))
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      return cacheResponse(event.request, response);
    }))
  );
});
