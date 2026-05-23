// @client-reason: 마운트 시 랜덤 셔플(7개 표시) + router.push 클라이언트 hook
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { STRINGS } from "@/lib/strings";
import { secureShuffle } from "@/lib/random";

const DISPLAY_COUNT = 7;

function shuffleAndPick(list: ReadonlyArray<string>, count: number): ReadonlyArray<string> {
  // SonarCloud S2245 회피 — Math.random 대신 crypto-backed shuffle.
  return secureShuffle(list).slice(0, count);
}

/** 홈 검색바 아래 인기 검색어 칩 — 8개 중 7개 랜덤, 클릭 시 /search?q=키워드 로 이동 */
export function HomePopularKeywords(): React.ReactElement {
  const router = useRouter();
  const keywords = STRINGS.globalSearch.popularKeywordsList;

  // SSR/Hydration mismatch 회피: 첫 렌더는 앞 7개 (결정적), 마운트 후 셔플
  const [displayed, setDisplayed] = useState<ReadonlyArray<string>>(() => keywords.slice(0, DISPLAY_COUNT));
  useEffect(() => {
    setDisplayed(shuffleAndPick(keywords, DISPLAY_COUNT));
  }, [keywords]);

  const onSelect = (q: string): void => {
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <section aria-label={STRINGS.globalSearch.popularKeywords} className="flex w-full justify-center px-4 pb-4">
      {/* 모바일: 가로 스크롤 1줄 / 데스크탑(md+): flex-wrap 중앙 정렬 */}
      {/* 모바일: 가로 스크롤 1줄 / 데스크탑(md+): flex-wrap 중앙 */}
      <ul className="flex w-full max-w-[680px] gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-hide md:flex-wrap md:justify-center md:overflow-visible md:whitespace-normal">
        {displayed.map((kw) => (
          <li key={kw} className="shrink-0">
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
