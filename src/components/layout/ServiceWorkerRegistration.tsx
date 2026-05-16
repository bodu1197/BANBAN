// @client-reason: navigator.serviceWorker는 브라우저 전용 API. 서비스 워커 등록·업데이트 알림은 클라이언트에서만 가능.
"use client";

import { useEffect } from "react";

const SW_URL = "/sw.js";

function postSkipWaiting(registration: ServiceWorkerRegistration): void {
  registration.waiting?.postMessage({ type: "SKIP_WAITING" });
}

async function registerServiceWorker(): Promise<void> {
  if (typeof globalThis.navigator === "undefined" || !("serviceWorker" in globalThis.navigator)) return;
  try {
    const registration = await globalThis.navigator.serviceWorker.register(SW_URL, { scope: "/" });
    // 업데이트 발견 시 새 SW 활성화 트리거
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && globalThis.navigator.serviceWorker.controller) {
          postSkipWaiting(registration);
        }
      });
    });
    // 컨트롤러가 바뀌면 페이지 갱신 — 새 자산 즉시 반영
    let reloaded = false;
    globalThis.navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      globalThis.location.reload();
    });
  } catch {
    /* SW 등록 실패는 PWA 부가 기능 — 사이트 동작에 영향 없음 */
  }
}

export function ServiceWorkerRegistration(): null {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}
