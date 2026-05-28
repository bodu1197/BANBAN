// @client-reason: navigator.serviceWorker는 브라우저 전용 API. 기존 SW unregister 만 수행.
"use client";

import { useEffect } from "react";
import { idle } from "@/lib/idle";

const UNREGISTER_IDLE_TIMEOUT_MS = 5000;

/** 긴급: controllerchange + reload 무한 루프 사고로 SW 영구 비활성화.
 *  - 기존 등록된 SW 가 있으면 unregister
 *  - 새 등록 안 함 — public/sw.js 가 activate 시 자기 자신 unregister 하는 자살 버전
 *  - 추후 안정화된 PWA 패턴으로 재도입 가능 */
async function cleanupServiceWorker(): Promise<void> {
  if (typeof globalThis.navigator === "undefined" || !("serviceWorker" in globalThis.navigator)) return;
  try {
    const registrations = await globalThis.navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  } catch {
    /* SW unregister 실패는 비핵심 */
  }
}

export function ServiceWorkerRegistration(): null {
  useEffect(() => {
    idle(() => void cleanupServiceWorker(), UNREGISTER_IDLE_TIMEOUT_MS);
  }, []);
  return null;
}
