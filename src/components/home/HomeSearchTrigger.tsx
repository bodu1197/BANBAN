import Link from "next/link";
import { Search } from "lucide-react";
import { STRINGS } from "@/lib/strings";

// SSR-only: placeholder 회전(setInterval)을 제거하고 첫 placeholder만 정적 표시.
// 홈 LCP 영역 client component 제거 → hydration 비용 0, JS 청크 감소.
export function HomeSearchTrigger(): React.ReactElement {
  const placeholders = STRINGS.globalSearch.triggerPlaceholders;
  const placeholder = placeholders[0] ?? "";

  return (
    <div className="flex w-full justify-center px-4 pt-6 pb-3 md:pt-8">
      <Link
        href="/search"
        aria-label={STRINGS.globalSearch.triggerLabel}
        className="flex w-full max-w-[680px] items-center gap-[10px] rounded-[30px] border border-brand-primary bg-background px-4 h-[52px] text-left transition-colors hover:bg-brand-primary/5 focus-visible:bg-brand-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        <span aria-hidden="true" className="flex-1 truncate text-sm text-muted-foreground">{placeholder}</span>
        <Search className="h-5 w-5 shrink-0 text-brand-primary" aria-hidden="true" />
      </Link>
    </div>
  );
}
