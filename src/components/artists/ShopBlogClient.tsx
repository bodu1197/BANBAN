// @client-reason: 모든 섹션을 한 페이지에 렌더 + sticky 탭 nav(anchor scroll) + IntersectionObserver로 activeTab 자동 갱신
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { PortfolioWithMedia, ReviewWithUser, BeforeAfterPhoto } from "@/lib/supabase/queries";
import type { EventCardData } from "@/lib/supabase/event-queries";
import { EventCard } from "@/components/event/EventCard";
import { ShopTabsNav, type ShopTabId } from "./ShopTabsNav";
import { PortfolioTabContent } from "./PortfolioTabContent";
import { BeforeAfterTabContent } from "./BeforeAfterTabContent";
import { ReviewList } from "@/components/reviews/ReviewList";

const SECTION_IDS: ReadonlyArray<ShopTabId> = ["home", "events", "portfolio", "beforeAfter", "reviews"];
const VALID_TABS: ReadonlySet<string> = new Set<ShopTabId>(SECTION_IDS);
// smooth scroll 애니메이션이 끝날 때까지 observer가 setActiveTab을 덮어쓰지 않도록 대기
const SCROLL_SETTLE_MS = 800;

export interface ShopBlogData {
  events: EventCardData[];
  portfolios: PortfolioWithMedia[];
  reviews: ReviewWithUser[];
  beforeAfterPhotos: BeforeAfterPhoto[];
}

export interface ShopBlogCounts {
  events: number;
  portfolios: number;
  beforeAfter: number;
  reviews: number;
}

export interface ShopBlogLabels {
  totalCount: string;
  noPortfolio: string;
  noReviews: string;
  noBeforeAfter: string;
  noEvents: string;
  beforeAfterCount: string;
  gridView: string;
  listView: string;
  before: string;
  after: string;
  events: string;
  portfolio: string;
  beforeAfter: string;
  reviews: string;
  writeReview: string;
}

interface ShopBlogClientProps {
  hero: React.ReactNode;
  data: ShopBlogData;
  counts: ShopBlogCounts;
  labels: ShopBlogLabels;
  artistId: string;
  isLoggedIn: boolean;
}

function EventsSection({
  events,
  emptyMessage,
}: Readonly<{ events: EventCardData[]; emptyMessage: string }>): React.ReactElement {
  if (events.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {events.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function -- 5개 섹션 + tab nav + observer 통합 렌더
export function ShopBlogClient({
  hero,
  data,
  counts,
  labels,
  artistId,
  isLoggedIn,
}: Readonly<ShopBlogClientProps>): React.ReactElement {
  const { events, portfolios, reviews, beforeAfterPhotos } = data;
  const { events: eventCount, portfolios: portfolioCount, beforeAfter: beforeAfterCount, reviews: reviewCount } = counts;
  const {
    totalCount: totalCountLabel,
    noPortfolio: noPortfolioMessage,
    noReviews: noReviewsMessage,
    noBeforeAfter: noBeforeAfterMessage,
    noEvents: noEventsMessage,
    beforeAfterCount: beforeAfterCountLabel,
    gridView: gridViewLabel,
    listView: listViewLabel,
    before: beforeLabel,
    after: afterLabel,
    events: eventsLabel,
    portfolio: portfolioLabel,
    beforeAfter: beforeAfterLabel,
    reviews: reviewsLabel,
    writeReview: writeReviewLabel,
  } = labels;

  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam ?? "home";
  const [activeTab, setActiveTab] = useState<ShopTabId>(
    VALID_TABS.has(initialTab) ? (initialTab as ShopTabId) : "home",
  );
  const programmaticScrollRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  const scrollToSection = useCallback((tab: ShopTabId, smooth: boolean): void => {
    const el = document.getElementById(`tabpanel-${tab}`);
    if (!el) return;
    programmaticScrollRef.current = true;
    // prefers-reduced-motion 사용자는 즉시 점프 (스크롤 애니메이션 비활성화)
    const reduceMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: smooth && !reduceMotion ? "smooth" : "auto", block: "start" });
    if (settleTimerRef.current !== null) globalThis.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = globalThis.setTimeout(() => {
      programmaticScrollRef.current = false;
      settleTimerRef.current = null;
    }, SCROLL_SETTLE_MS);
  }, []);

  // unmount 시 pending timer 정리
  useEffect(() => {
    return () => {
      if (settleTimerRef.current !== null) {
        globalThis.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, []);

  const handleTabClick = useCallback((tab: ShopTabId): void => {
    setActiveTab(tab);
    scrollToSection(tab, true);
  }, [scrollToSection]);

  // ?tab=... 진입 시 해당 섹션으로 즉시 점프 (home은 스크롤 불필요)
  useEffect(() => {
    if (!tabParam || tabParam === "home" || !VALID_TABS.has(tabParam)) return;
    scrollToSection(tabParam as ShopTabId, false);
  }, [tabParam, scrollToSection]);

  // 스크롤 위치에 따라 activeTab 자동 갱신
  // rootMargin top -100px: sticky 헤더(48px)+탭(~50px) 아래에서 트리거
  // rootMargin bottom -55%: viewport 상단 ~45% 영역만 활성 판정 → 다음 섹션 미리 활성화 방지
  // threshold [0, 0.5]: 진입/중심 두 지점만 → 콜백 빈도 최소화
  // eslint-disable-next-line react-hooks/exhaustive-deps -- observer는 마운트 시 1회만 설정; SECTION_IDS/VALID_TABS는 모듈 상수
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (programmaticScrollRef.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const rawId = visible.target.id.replace("tabpanel-", "");
        if (VALID_TABS.has(rawId)) setActiveTab(rawId as ShopTabId);
      },
      { rootMargin: "-100px 0px -55% 0px", threshold: [0, 0.5] },
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(`tabpanel-${id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const tabs: ReadonlyArray<{ id: ShopTabId; label: string; count?: number }> = [
    { id: "home", label: "홈" },
    { id: "events", label: eventsLabel, count: eventCount },
    { id: "portfolio", label: portfolioLabel, count: portfolioCount },
    { id: "beforeAfter", label: beforeAfterLabel, count: beforeAfterCount },
    { id: "reviews", label: reviewsLabel, count: reviewCount },
  ];

  return (
    <>
      <section
        id="tabpanel-home"
        role="tabpanel"
        aria-labelledby="tab-home"
        aria-label="홈"
        className="scroll-mt-28"
      >
        {hero}
      </section>
      <ShopTabsNav activeTab={activeTab} onTabClick={handleTabClick} tabs={tabs} />

      <section
        id="tabpanel-events"
        role="tabpanel"
        aria-labelledby="tab-events"
        aria-label={eventsLabel}
        className="scroll-mt-28 space-y-3 px-4 py-6"
      >
        <h2 className="text-base font-bold">
          {eventsLabel} <span className="text-muted-foreground">({eventCount.toLocaleString()})</span>
        </h2>
        <EventsSection events={events} emptyMessage={noEventsMessage} />
      </section>

      <section
        id="tabpanel-portfolio"
        role="tabpanel"
        aria-labelledby="tab-portfolio"
        aria-label={portfolioLabel}
        className="scroll-mt-28 space-y-3 border-t border-border px-4 py-6"
      >
        <h2 className="text-base font-bold">
          {portfolioLabel} <span className="text-muted-foreground">({portfolioCount.toLocaleString()})</span>
        </h2>
        <PortfolioTabContent
          portfolios={portfolios}
          totalCountLabel={totalCountLabel}
          emptyMessage={noPortfolioMessage}
          gridViewLabel={gridViewLabel}
          listViewLabel={listViewLabel}
        />
      </section>

      <section
        id="tabpanel-beforeAfter"
        role="tabpanel"
        aria-labelledby="tab-beforeAfter"
        aria-label={beforeAfterLabel}
        className="scroll-mt-28 space-y-3 border-t border-border px-4 py-6"
      >
        <h2 className="text-base font-bold">
          {beforeAfterLabel} <span className="text-muted-foreground">({beforeAfterCount.toLocaleString()})</span>
        </h2>
        <BeforeAfterTabContent
          photos={beforeAfterPhotos}
          totalCountLabel={beforeAfterCountLabel}
          emptyMessage={noBeforeAfterMessage}
          beforeLabel={beforeLabel}
          afterLabel={afterLabel}
        />
      </section>

      <section
        id="tabpanel-reviews"
        role="tabpanel"
        aria-labelledby="tab-reviews"
        aria-label={reviewsLabel}
        className="scroll-mt-28 space-y-3 border-t border-border px-4 py-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">
            {reviewsLabel} <span className="text-muted-foreground">({reviewCount.toLocaleString()})</span>
          </h2>
          {isLoggedIn ? (
            <Link
              href={`/reviews/write?id=${encodeURIComponent(artistId)}`}
              className="text-sm font-medium text-brand-primary transition-colors hover:text-brand-primary-hover focus-visible:rounded focus-visible:text-brand-primary-hover focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {writeReviewLabel}
            </Link>
          ) : null}
        </div>
        <ReviewList reviews={reviews} emptyMessage={noReviewsMessage} />
      </section>
    </>
  );
}
