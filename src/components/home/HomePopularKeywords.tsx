import Link from "next/link";
import { Sparkles } from "lucide-react";
import { STRINGS } from "@/lib/strings";

const DISPLAY_COUNT = 7;

// SSR-only: 셔플(useEffect) 제거하고 첫 7개를 정적 표시.
// 홈 client component 제거 → hydration 비용 0, JS 청크 감소.
export function HomePopularKeywords(): React.ReactElement {
  const keywords = STRINGS.globalSearch.popularKeywordsList.slice(0, DISPLAY_COUNT);

  return (
    <section aria-label={STRINGS.globalSearch.popularKeywords} className="flex w-full justify-center px-4 pb-4">
      <ul className="flex w-full max-w-[680px] gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-hide md:flex-wrap md:justify-center md:overflow-visible md:whitespace-normal">
        {keywords.map((kw) => (
          <li key={kw} className="shrink-0">
            <Link
              href={`/search?q=${encodeURIComponent(kw)}`}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-xs text-foreground motion-safe:transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:border-brand-primary focus-visible:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <Sparkles className="h-3 w-3 text-brand-primary" aria-hidden="true" />
              {kw}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
