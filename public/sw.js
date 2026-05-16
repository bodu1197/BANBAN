// Banunni Service Worker
// Strategy:
//   - precache: 핵심 셸 자산 (offline page, manifest, icons)
//   - runtime cache: stale-while-revalidate (정적 리소스), network-first (HTML/API)
//   - offline fallback: 네트워크 실패 시 /offline.html 반환
// 자동 업데이트: skipWaiting + clients.claim 으로 새 SW 즉시 활성화

const VERSION = "banunni-v1";
const CACHE_STATIC = `${VERSION}-static`;
const CACHE_RUNTIME = `${VERSION}-runtime`;

const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
  "/ban_logo.png",
];

const SCOPE_BYPASS = [
  "/api/",
  "/admin/",
  "/_next/static/", // Next.js가 자체 long-cache headers 적용
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function shouldBypass(url) {
  if (url.origin !== self.location.origin) return true;
  return SCOPE_BYPASS.some((prefix) => url.pathname.startsWith(prefix));
}

async function networkFirstHtml(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const copy = response.clone();
      const cache = await caches.open(CACHE_RUNTIME);
      cache.put(request, copy).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match("/offline.html");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_RUNTIME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    })
    .catch(() => cached);
  return cached ?? networkPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (shouldBypass(url)) return;

  const accept = request.headers.get("accept") ?? "";
  const isHtml = request.mode === "navigate" || accept.includes("text/html");

  if (isHtml) {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  // 이미지/폰트/CSS/JS — stale-while-revalidate
  if (/\.(png|jpg|jpeg|webp|svg|gif|ico|css|woff2?|ttf)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// 클라이언트에서 보낸 SKIP_WAITING 메시지에 응답 (업데이트 즉시 적용)
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
