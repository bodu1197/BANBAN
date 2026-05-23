// @client-reason: setInterval 자동 회전 + 슬라이드 transform 애니메이션 + 인디케이터 — 클라이언트 상태 필요
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroBannerData } from "@/lib/supabase/hero-banner-queries";

interface Props {
  banners: ReadonlyArray<HeroBannerData>;
}

const SLIDE_INTERVAL_MS = 4000;

// DB banners 가 비어있으면 캐러셀 자체를 숨김 — 외부 도메인 (babitalk) 의존 제거 (next.config remotePatterns 동기화).
const FALLBACK_BANNERS: ReadonlyArray<HeroBannerData> = [];

function SlideContent({ banner, priority }: Readonly<{ banner: HeroBannerData; priority: boolean }>): React.ReactElement {
  // alt 우선순위: title > subtitle > 기본값. 빈 alt 회피 + SEO 이미지 인덱싱 강화.
  const altText = banner.title ?? banner.subtitle ?? "반언니 시즌 배너";
  return (
    <div className="relative h-full w-full">
      {/* next/image — Vercel Image Optimizer 가 AVIF/WebP 변환 + 글로벌 CDN 캐시 (인도네시아 등 해외 latency 개선)
          priority — 첫 슬라이드만 true (LCP 보호). 나머지는 false 지만 fill + sizes 로 viewport 안 들어오면 즉시 로드.
          referrerPolicy — 외부 fallback 도메인(바비톡) IP leak 방지. */}
      <Image
        src={banner.imageUrl}
        alt={altText}
        fill
        className="object-cover"
        sizes="(min-width: 1024px) 1024px, 100vw"
        priority={priority}
        referrerPolicy="no-referrer"
      />
      {/* title/subtitle 있을 때만 텍스트 표시. 어두운 gradient 장막 제거 — 이미지 본연 유지.
          텍스트 가독성은 drop-shadow + 굵은 폰트로 확보 (밝은 이미지에서도 잘 보임) */}
      {banner.title || banner.subtitle ? (
        <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end gap-1 p-5 text-white">
          {banner.title ? <h3 className="text-lg font-bold leading-tight [text-shadow:0_2px_8px_rgba(0,0,0,0.7)]">{banner.title}</h3> : null}
          {banner.subtitle ? <p className="text-sm [text-shadow:0_2px_6px_rgba(0,0,0,0.7)]">{banner.subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function NavArrow({ direction, onClick }: Readonly<{ direction: "prev" | "next"; onClick: () => void }>): React.ReactElement {
  const isPrev = direction === "prev";
  const Icon = isPrev ? ChevronLeft : ChevronRight;
  // mouse hover 시 페이드 인 (group-hover) — 모바일 터치는 인디케이터로 충분
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPrev ? "이전 배너" : "다음 배너"}
      className={`pointer-events-none absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-0 shadow-md transition-opacity duration-200 hover:bg-black/80 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:flex md:group-hover:pointer-events-auto md:group-hover:opacity-100 ${isPrev ? "left-3" : "right-3"}`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
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

/** link_url 정규화 — 공백 trim, 슬래시/스킴 없는 입력은 "/" prefix 부여, 빈 문자열은 null */
function normalizeLinkUrl(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed) || trimmed.startsWith("#")) return trimmed;
  // admin placeholder 안내(/exhibition 또는 https://...)를 안 지킨 경우 자동 보정
  return `/${trimmed}`;
}

function Slide({ banner, active, isFirst }: Readonly<{ banner: HeroBannerData; active: boolean; isFirst: boolean }>): React.ReactElement {
  // 비활성 슬라이드: Tab 진입 차단 + 스크린리더 숨김. priority 는 첫 슬라이드만 (LCP 우선).
  const href = normalizeLinkUrl(banner.linkUrl);
  const isExternal = href !== null && /^https?:\/\//i.test(href);
  return (
    <div className="w-full shrink-0" aria-hidden={!active}>
      {href ? (
        <Link
          href={href}
          aria-label={`${banner.title ?? "히어로 배너로 이동"}${isExternal ? " (새 탭에서 열림)" : ""}`}
          tabIndex={active ? 0 : -1}
          // 외부 URL 은 새 탭 + 보안 rel — 같은 탭 강제 이동 방지 (사용자 보고 2026-05-18).
          // aria-label 에 "(새 탭에서 열림)" 명시 — 스크린리더 사용자가 컨텍스트 변경 예측 가능.
          {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <SlideContent banner={banner} priority={isFirst} />
        </Link>
      ) : (
        <SlideContent banner={banner} priority={isFirst} />
      )}
    </div>
  );
}

export function HomeHeroCarousel({ banners }: Readonly<Props>): React.ReactElement | null {
  const list = banners.length > 0 ? banners : FALLBACK_BANNERS;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // prefers-reduced-motion 사용자: 자동 회전 비활성화 (WCAG 2.2.2 Pause, Stop, Hide 준수).
  // OS 설정을 명시적으로 켠 사용자는 자동 슬라이드를 원치 않음. 인디케이터 클릭으로 수동 진행 가능.
  useEffect(() => {
    const mq = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent): void => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (list.length <= 1 || paused || reducedMotion) return;
    // 4초 간격은 flicker 가 아니므로 WCAG 2.3.1 (Three Flashes) 위반 아님.
    // hover/focus pause + prefers-reduced-motion 존중 + 인디케이터로 사용자 제어 가능.
    const timer = globalThis.setInterval(() => {
      setIdx((i) => (i + 1) % list.length);
    }, SLIDE_INTERVAL_MS);
    return () => globalThis.clearInterval(timer);
  }, [list.length, paused, reducedMotion]);

  // 좌측 슬라이드 애니메이션 — transform translateX(-idx*100%)
  // ref 로 직접 style 조작 — 인라인 style JSX 회피 (CSS Design Enforcer 정책)
  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${idx * 100}%)`;
    }
  }, [idx]);

  if (list.length === 0) return null;

  const goPrev = (): void => setIdx((i) => (i - 1 + list.length) % list.length);
  const goNext = (): void => setIdx((i) => (i + 1) % list.length);

  return (
    <section aria-label="히어로 배너" className="px-4">
      {/* aspect-[3/1] 모든 viewport 통일 — 모바일/PC 모두 960x320 권장 비율로 잘림 없음
          group — 마우스 hover 시 좌우 화살표 페이드 인 트리거 */}
      <div
        className="group relative w-full overflow-hidden rounded-2xl bg-muted aspect-[3/1]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div ref={trackRef} className="flex h-full w-full transition-transform duration-500 ease-out">
          {list.map((banner, i) => (
            <Slide key={banner.id} banner={banner} active={i === idx} isFirst={i === 0} />
          ))}
        </div>
        {list.length > 1 ? (
          <>
            <NavArrow direction="prev" onClick={goPrev} />
            <NavArrow direction="next" onClick={goNext} />
            <Indicators count={list.length} currentIdx={idx} onSelect={setIdx} />
          </>
        ) : null}
      </div>
    </section>
  );
}
