// @client-reason: 회전 placeholder 애니메이션 (setInterval) + 라우터 push 가 클라이언트 상태 필요
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { STRINGS } from "@/lib/strings";

const ROTATE_INTERVAL_MS = 2500;

export function HomeSearchTrigger(): React.ReactElement {
  const router = useRouter();
  const placeholders = STRINGS.globalSearch.triggerPlaceholders;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (placeholders.length <= 1) return;
    const timer = globalThis.setInterval(() => {
      setIdx((i) => (i + 1) % placeholders.length);
    }, ROTATE_INTERVAL_MS);
    return () => globalThis.clearInterval(timer);
  }, [placeholders.length]);

  // 인덱스 검증 — Tailwind/runtime 둘 다 안전. ESLint security/detect-object-injection 회피
  const current = idx >= 0 && idx < placeholders.length ? placeholders.at(idx) ?? "" : "";

  return (
    <div className="flex w-full justify-center px-4 py-6 md:py-8">
      {/* 바비톡 spec — max-w 680px, h 52px, border 1px brand-primary, rounded-[30px], gap 10px, px-16 py-8 */}
      <button
        type="button"
        onClick={() => router.push("/search")}
        aria-label={STRINGS.globalSearch.triggerLabel}
        className="flex w-full max-w-[680px] items-center gap-[10px] rounded-[30px] border border-brand-primary bg-background px-4 h-[52px] text-left transition-colors hover:bg-brand-primary/5 focus-visible:bg-brand-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Search className="h-5 w-5 shrink-0 text-brand-primary" aria-hidden="true" />
        {/* 회전 placeholder 는 시각적 힌트 — 버튼의 aria-label 이 이미 의도 전달, 스크린 리더에는 숨김 */}
        <span aria-hidden="true" className="truncate text-sm text-muted-foreground">{current}</span>
      </button>
    </div>
  );
}
