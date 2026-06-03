// requestIdleCallback 통합 헬퍼.
// Safari 등 미지원 환경에서는 setTimeout 으로 fallback (지정 timeout 의 75%).
// 모든 idle defer 패턴은 이 모듈을 사용해야 — 5곳에 중복되던 구현 단일화.

const FALLBACK_RATIO = 0.75;
const FALLBACK_MIN_MS = 500;
const DEFAULT_TIMEOUT_MS = 2000;

export function idle(cb: () => void, timeoutMs: number = DEFAULT_TIMEOUT_MS): void {
  const ric =
    typeof globalThis !== "undefined"
      ? (globalThis as typeof globalThis & { requestIdleCallback?: typeof window.requestIdleCallback }).requestIdleCallback
      : undefined;
  if (ric) {
    ric(cb, { timeout: timeoutMs });
    return;
  }
  globalThis.setTimeout(cb, Math.max(FALLBACK_MIN_MS, Math.floor(timeoutMs * FALLBACK_RATIO)));
}
