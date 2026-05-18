// @client-reason: setInterval 자동 회전 + 인디케이터 클릭으로 슬라이드 이동 — 클라이언트 상태 필요
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HeroBannerData } from "@/lib/supabase/hero-banner-queries";

interface Props {
  banners: ReadonlyArray<HeroBannerData>;
}

const SLIDE_INTERVAL_MS = 4000;

// 제작 기간 임시 fallback — DB banners 가 비어있을 때 바비톡 이미지 차용
const FALLBACK_BANNERS: ReadonlyArray<HeroBannerData> = [
  {
    id: "fallback-1",
    title: "시즌 인기 시술",
    subtitle: "지금 가장 많이 찾는 시술 모음",
    imageUrl: "https://images.babitalk.com/2024_event/12_29/4be8a155-93b2-4731-bc81-6fc486a3fef2",
    linkUrl: null,
  },
  {
    id: "fallback-2",
    title: "신규 가입 이벤트",
    subtitle: "첫 결제 할인 혜택",
    imageUrl: "https://images.babitalk.com/2024_event/12_29/aac8df97-f3a3-4b3b-984d-bb43dc26d4e9",
    linkUrl: null,
  },
  {
    id: "fallback-3",
    title: "전문 아티스트 추천",
    subtitle: "인증된 반영구 전문가 만나기",
    imageUrl: "https://images.babitalk.com/2024_event/12_29/c5a4d6a1-3f8f-46d5-b7d9-7e3e7c2f7e3e",
    linkUrl: null,
  },
];

function SlideContent({ banner }: Readonly<{ banner: HeroBannerData }>): React.ReactElement {
  const altText = banner.title ?? "히어로 배너";
  return (
    <div className="relative h-full w-full">
      {/* next/image 우회 — 임시 외부 도메인(바비톡) 호환성. 추후 Supabase Storage 이전 후 next/image 로 교체.
          loading="eager" — above-the-fold 히어로라 LCP 보호. referrerpolicy — 외부 도메인 IP leak 방지. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={banner.imageUrl}
        alt={altText}
        className="h-full w-full object-cover"
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
      />
      {/* title/subtitle 모두 없으면 오버레이 생략 — 이미지만 사용 가능 */}
      {banner.title || banner.subtitle ? (
        <div className="absolute inset-0 flex flex-col justify-end gap-1 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-5 text-white">
          {banner.title ? <h3 className="text-lg font-bold leading-tight drop-shadow-sm">{banner.title}</h3> : null}
          {banner.subtitle ? <p className="text-sm opacity-90 drop-shadow-sm">{banner.subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function Indicators({ count, currentIdx, onSelect }: Readonly<{
  count: number; currentIdx: number; onSelect: (idx: number) => void;
}>): React.ReactElement {
  // aria-live 제거 — 4초마다 발화되어 스크린리더 사용자 짜증. 인디케이터 자체가 keyboard accessible (role="tab")
  return (
    <div className="absolute bottom-3 right-4 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
      <span aria-hidden="true">{currentIdx + 1} / {count}</span>
      <span aria-hidden="true">·</span>
      <div className="flex gap-1" role="tablist" aria-label="히어로 슬라이드 인디케이터">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={`indicator-${i}`}
            type="button"
            role="tab"
            aria-selected={i === currentIdx}
            aria-label={`슬라이드 ${i + 1}`}
            tabIndex={i === currentIdx ? 0 : -1}
            onClick={() => onSelect(i)}
            className="flex h-6 w-6 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span className={`block h-2 w-2 rounded-full transition-colors ${i === currentIdx ? "bg-white" : "bg-white/40"}`} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function HomeHeroCarousel({ banners }: Readonly<Props>): React.ReactElement | null {
  const list = banners.length > 0 ? banners : FALLBACK_BANNERS;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (list.length <= 1 || paused) return;
    // prefers-reduced-motion 존중 — 사용자가 모션 감소 선호 시 자동 회전 안 함 (WCAG 2.3.3)
    const mq = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) return;
    const timer = globalThis.setInterval(() => {
      setIdx((i) => (i + 1) % list.length);
    }, SLIDE_INTERVAL_MS);
    return () => globalThis.clearInterval(timer);
  }, [list.length, paused]);

  if (list.length === 0) return null;

  // 인덱스 검증 — Tailwind/runtime 안전 (object injection 회피)
  const current = idx >= 0 && idx < list.length ? list.at(idx) : null;
  if (!current) return null;

  return (
    <section aria-label="히어로 배너" className="px-4">
      {/* onFocusCapture/onBlurCapture — children 사이 focus 이동 시에도 pause 유지 (bubble 한계 회피) */}
      <div
        className="relative w-full overflow-hidden rounded-2xl bg-muted aspect-[16/7] md:aspect-[3/1]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {current.linkUrl ? (
          <Link href={current.linkUrl} aria-label={current.title ?? "히어로 배너로 이동"} className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary">
            <SlideContent banner={current} />
          </Link>
        ) : (
          <SlideContent banner={current} />
        )}
        {list.length > 1 ? <Indicators count={list.length} currentIdx={idx} onSelect={setIdx} /> : null}
      </div>
    </section>
  );
}
