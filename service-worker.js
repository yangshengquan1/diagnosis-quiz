export const CACHE_NAME = "diagnosis-quiz-v7";
export const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./styles.css",
  "./src/app.js",
  "./src/quiz-core.js",
  "./src/storage.js",
  "./src/templates.js",
  "./src/pwa.js",
  "./data/questions.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/icon-maskable.svg"
];

const NETWORK_FIRST_PATHS = new Set([
  "/index.html",
  "/styles.css",
  "/src/app.js",
  "/src/quiz-core.js",
  "/src/storage.js",
  "/src/templates.js",
  "/src/pwa.js",
  "/data/questions.js"
]);

export function requestPathname(requestUrl) {
  return new URL(requestUrl, "https://example.com").pathname;
}

export function isNetworkFirstRequest(requestUrl) {
  const pathname = requestPathname(requestUrl);

  if (pathname === "/" || /^\/[^/]+\/$/.test(pathname)) {
    return true;
  }

  return [...NETWORK_FIRST_PATHS].some((shellPath) =>
    pathname === shellPath || pathname.endsWith(shellPath)
  );
}

export function shouldCacheNetworkResponse(response) {
  return Boolean(response) && response.status === 200 && response.type !== "opaque";
}

async function handleNetworkFirst(request) {
  try {
    const response = await fetch(request);

    if (shouldCacheNetworkResponse(response)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    throw new Error("Network request failed and no cached response was available.");
  }
}

async function handleCacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (shouldCacheNetworkResponse(response)) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }

  return response;
}

function registerServiceWorkerHandlers(scope) {
  scope.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
    scope.skipWaiting();
  });

  scope.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
    );
    scope.clients.claim();
  });

  scope.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
      return;
    }

    event.respondWith(
      isNetworkFirstRequest(event.request.url)
        ? handleNetworkFirst(event.request)
        : handleCacheFirst(event.request)
    );
  });
}

if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
  registerServiceWorkerHandlers(self);
}
