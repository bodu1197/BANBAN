// 긴급 비활성화 — controllerchange + location.reload() 패턴이 무한 새로고침 유발 사고로 SW 영구 unregister.
// 이전 버전: PWA 캐시 + offline fallback. 추후 안정화된 다른 패턴으로 재도입 예정.
// 자살 절차:
//  1. install: skipWaiting 으로 즉시 활성화 진입
//  2. activate: 모든 cache 삭제 + 자기 자신 unregister + 모든 클라이언트 새로고침 (마지막 1회)
//  3. 다음 페이지 로드부터 SW 없음 → fresh JS 받음 → ServiceWorkerRegistration 도 등록 안 함

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // 1. 모든 기존 cache 삭제 (allSettled 로 부분 실패해도 진행)
    const keys = await caches.keys();
    await Promise.allSettled(keys.map((key) => caches.delete(key)));
    // 2. 자기 자신 unregister
    await self.registration.unregister();
    // 3. 모든 열린 클라이언트 navigate (마지막 1회 reload — SW 없는 상태로)
    //    origin 검증으로 cross-origin navigate 방어 (theoretically client.url 은 same-origin)
    const clients = await self.clients.matchAll({ type: "window" });
    for (const client of clients) {
      try {
        const url = new URL(client.url);
        if (url.origin === self.location.origin) {
          client.navigate(url.href);
        }
      } catch { /* navigate 실패 무시 */ }
    }
  })());
});

// fetch handler 없음 — 모든 요청은 네트워크 직접 처리
