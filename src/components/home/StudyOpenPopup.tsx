// @client-reason: localStorage(외부 스토어)로 사용자가 닫은 상태를 세션 간 유지 — useSyncExternalStore 동기화
"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { GraduationCap, X, ArrowRight } from "lucide-react";

const DISMISS_KEY = "study_open_popup_v1"; // 버전 접미사 — 추후 재공지 시 v2 로 올려 재노출

// localStorage 를 외부 스토어로 구독. 같은 탭 닫기 + 다른 탭 storage 이벤트 모두 반영.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  globalThis.addEventListener?.("storage", onChange);
  return () => {
    listeners.delete(onChange);
    globalThis.removeEventListener?.("storage", onChange);
  };
}

function isDismissed(): boolean {
  try {
    return globalThis.localStorage?.getItem(DISMISS_KEY) === "1";
  } catch {
    return false; // localStorage 차단 환경 — 표시
  }
}

function isDismissedOnServer(): boolean {
  // SSR에서 표시 → 레이아웃 공간을 미리 잡아 신규 방문자는 이동 없음(CLS 0).
  // 이미 닫은 사용자만 하이드레이션 직후 숨겨짐(쿠키 없이 홈 ISR을 유지하기 위한 트레이드오프).
  return false;
}

function dismiss(): void {
  try {
    globalThis.localStorage?.setItem(DISMISS_KEY, "1");
  } catch {
    /* localStorage 차단 — 무시 */
  }
  listeners.forEach((l) => l()); // 같은 탭 즉시 재렌더
}

// 홈 히어로 배너 위 공부방 오픈 안내 팝업. 사용자가 닫으면 localStorage 로 다시 뜨지 않음.
export function StudyOpenPopup(): React.ReactElement | null {
  const dismissed = useSyncExternalStore(subscribe, isDismissed, isDismissedOnServer);
  if (dismissed) return null;

  return (
    <section aria-label="공부방 오픈 안내" className="px-4 pt-3">
      <div className="relative overflow-hidden rounded-2xl border border-brand-primary/30 bg-brand-primary/10 p-4 pr-12">
        <button
          type="button"
          onClick={dismiss}
          aria-label="공부방 오픈 안내 닫기"
          className="absolute right-1 top-1 z-10 grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-brand-primary/15 hover:text-foreground focus-visible:bg-brand-primary/15 focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <Link
          href="/mypage/study"
          className="flex items-center gap-3.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-primary text-white">
            <GraduationCap className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-sm font-bold text-foreground">
              문신사 국가시험 공부방 오픈 <span aria-hidden="true">🎉</span>
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              2027 첫 국가시험 대비 — 과목별 문제풀이·모의고사·교과서를 한곳에서.
            </p>
          </div>
          <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-brand-primary sm:inline-flex">
            보러가기 <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </section>
  );
}
