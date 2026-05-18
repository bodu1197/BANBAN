// @client-reason: usePathname + scroll 위치 감지 + router.push — 모두 클라이언트 hook 필요
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { STRINGS } from "@/lib/strings";

// 홈에서 HomeSearchTrigger 영역(검색바 + 인기검색어 + 패딩) 이 viewport 위로 사라지는 대략적 위치 (~200px).
const SCROLL_THRESHOLD = 200;

/** 헤더의 검색 아이콘 — 홈에서는 스크롤 후 노출, 다른 페이지에서는 항상 노출. opacity transition 으로 부드러운 등장 */
export function HeaderStickySearch(): React.ReactElement | null {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  // 가시성 자체만 추적 (boolean) — scrollY 매 픽셀이 아닌 threshold 교차 시에만 re-render
  const [visible, setVisible] = useState(!isHome);

  useEffect(() => {
    if (!isHome) {
      return;
    }
    let rafId = 0;
    // requestAnimationFrame throttle — 60fps scroll 이벤트를 frame 단위로 묶음
    const onScroll = (): void => {
      if (rafId !== 0) return;
      rafId = globalThis.requestAnimationFrame(() => {
        setVisible(globalThis.scrollY > SCROLL_THRESHOLD);
        rafId = 0;
      });
    };
    onScroll();
    globalThis.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      globalThis.removeEventListener("scroll", onScroll);
      if (rafId !== 0) globalThis.cancelAnimationFrame(rafId);
    };
  }, [isHome]);

  // DOM 항상 mount + opacity / pointer-events 로 부드러운 페이드 (갑작스러운 등장 회피)
  return (
    <button
      type="button"
      onClick={() => router.push("/search")}
      aria-label={STRINGS.globalSearch.triggerLabel}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-opacity duration-200 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <Search className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
