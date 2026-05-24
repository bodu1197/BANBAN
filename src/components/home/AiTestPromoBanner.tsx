import Link from "next/link";
import Image from "next/image";
import { Sparkles, ChevronRight } from "lucide-react";

export function AiTestPromoBanner(): React.ReactElement {
  return (
    <div className="px-4 py-2">
      <Link
        href="/beauty-sim/ai-test"
        aria-label="AI 반영구 시뮬레이션 체험하기"
        className="group flex w-full items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-brand-accent-purple to-brand-accent-purple-hover px-4 py-3 text-white shadow-md transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent-purple-ring focus-visible:ring-offset-2"
      >
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-white/10 ring-1 ring-white/20">
          <Image
            src="/images/beauty-sim/hero-banner-512w.webp"
            alt=""
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide opacity-90">AI 시뮬레이션</span>
          </div>
          <p className="truncate text-sm font-bold sm:text-base">
            내 얼굴에 어울리는 반영구 스타일 미리보기
          </p>
        </div>
        <ChevronRight className="h-5 w-5 flex-shrink-0 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
