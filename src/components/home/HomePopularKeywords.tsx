// @client-reason: router.push 로 검색 결과 페이지 이동 — useRouter 가 클라이언트 hook
"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { STRINGS } from "@/lib/strings";

/** 홈 검색바 아래 인기 검색어 칩 — 클릭 시 /search?q=키워드 로 이동 */
export function HomePopularKeywords(): React.ReactElement {
  const router = useRouter();
  const keywords = STRINGS.globalSearch.popularKeywordsList;

  const onSelect = (q: string): void => {
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <section aria-label={STRINGS.globalSearch.popularKeywords} className="flex w-full justify-center px-4 pb-4">
      <ul className="flex w-full max-w-[680px] flex-wrap gap-2">
        {keywords.map((kw) => (
          <li key={kw}>
            <button
              type="button"
              onClick={() => onSelect(kw)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:border-brand-primary focus-visible:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <Sparkles className="h-3 w-3 text-brand-primary" aria-hidden="true" />
              {kw}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
