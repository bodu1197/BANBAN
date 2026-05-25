// @client-reason: activeTab 기반 단일 탭 렌더 + sticky 탭 nav. 한 번에 한 탭의 콘텐츠만 노출.
"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { PortfolioWithMedia, ReviewWithUser, BeforeAfterPhoto } from "@/lib/supabase/queries";
import type { EventCardData } from "@/lib/supabase/event-queries";
import { EventCard } from "@/components/event/EventCard";
import { ShopTabsNav, SHOP_TABS_NAV_STICKY_TOP_PX, type ShopTabId } from "./ShopTabsNav";
import { PortfolioTabContent } from "./PortfolioTabContent";
import { BeforeAfterTabContent } from "./BeforeAfterTabContent";
import { ReviewList } from "@/components/reviews/ReviewList";

const VALID_TABS: ReadonlySet<ShopTabId> = new Set<ShopTabId>([
  "events",
  "portfolio",
  "beforeAfter",
  "reviews",
]);

function isShopTabId(value: string | null): value is ShopTabId {
  return value !== null && VALID_TABS.has(value as ShopTabId);
}

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

function EmptyMessage({ message }: Readonly<{ message: string }>): React.ReactElement {
  return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

function EventsPanel({
  events,
  emptyMessage,
}: Readonly<{ events: EventCardData[]; emptyMessage: string }>): React.ReactElement {
  if (events.length === 0) return <EmptyMessage message={emptyMessage} />;
  return (
    <div className="grid grid-cols-2 gap-3">
      {events.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  );
}

interface PanelProps {
  activeTab: ShopTabId;
  data: ShopBlogData;
  labels: ShopBlogLabels;
  artistId: string;
  isLoggedIn: boolean;
}

function renderActivePanel(props: Readonly<PanelProps>): React.ReactNode {
  const { activeTab, data, labels, artistId, isLoggedIn } = props;
  if (activeTab === "events") {
    return <EventsPanel events={data.events} emptyMessage={labels.noEvents} />;
  }
  if (activeTab === "portfolio") {
    return (
      <PortfolioTabContent
        portfolios={data.portfolios}
        totalCountLabel={labels.totalCount}
        emptyMessage={labels.noPortfolio}
        gridViewLabel={labels.gridView}
        listViewLabel={labels.listView}
      />
    );
  }
  if (activeTab === "beforeAfter") {
    return (
      <BeforeAfterTabContent
        photos={data.beforeAfterPhotos}
        totalCountLabel={labels.beforeAfterCount}
        emptyMessage={labels.noBeforeAfter}
        beforeLabel={labels.before}
        afterLabel={labels.after}
      />
    );
  }
  return (
    <>
      {isLoggedIn ? (
        <div className="mb-3 flex justify-end">
          <Link
            href={`/reviews/write?id=${encodeURIComponent(artistId)}`}
            className="text-sm font-medium text-brand-primary transition-colors hover:text-brand-primary-hover focus-visible:rounded focus-visible:text-brand-primary-hover focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {labels.writeReview}
          </Link>
        </div>
      ) : null}
      <ReviewList reviews={data.reviews} emptyMessage={labels.noReviews} />
    </>
  );
}

export function ShopBlogClient({
  hero,
  data,
  counts,
  labels,
  artistId,
  isLoggedIn,
}: Readonly<ShopBlogClientProps>): React.ReactElement {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: ShopTabId = isShopTabId(tabParam) ? tabParam : "events";
  const [activeTab, setActiveTab] = useState<ShopTabId>(initialTab);
  const tablistRef = useRef<HTMLDivElement>(null);
  // 탭 클릭 시점에 명시적 scroll 요청 플래그. 사용자 스크롤 위치는 건드리지 않고 클릭 시에만 보정.
  const scrollToTopOnNextRenderRef = useRef(false);

  const handleTabClick = useCallback((tab: ShopTabId): void => {
    scrollToTopOnNextRenderRef.current = true;
    setActiveTab(tab);
  }, []);

  // 탭 클릭 → 새 패널의 첫 부분이 sticky 영역(헤더 + 탭) 바로 아래에 오도록 scroll.
  // useLayoutEffect 로 paint 전에 처리 → flicker 없음.
  useLayoutEffect(() => {
    if (!scrollToTopOnNextRenderRef.current) return;
    scrollToTopOnNextRenderRef.current = false;
    const tablist = tablistRef.current;
    const panel = document.getElementById(`tabpanel-${activeTab}`);
    if (!tablist || !panel) return;
    const tablistHeight = tablist.getBoundingClientRect().height;
    const panelTop = panel.getBoundingClientRect().top;
    const targetTop = SHOP_TABS_NAV_STICKY_TOP_PX + tablistHeight;
    const delta = panelTop - targetTop;
    if (Math.abs(delta) > 1) {
      globalThis.scrollBy({ top: delta, behavior: "auto" });
    }
  }, [activeTab]);

  const tabs: ReadonlyArray<{ id: ShopTabId; label: string; count?: number }> = [
    { id: "events", label: labels.events, count: counts.events },
    { id: "portfolio", label: labels.portfolio, count: counts.portfolios },
    { id: "beforeAfter", label: labels.beforeAfter, count: counts.beforeAfter },
    { id: "reviews", label: labels.reviews, count: counts.reviews },
  ];

  return (
    <>
      {hero}
      <ShopTabsNav ref={tablistRef} activeTab={activeTab} onTabClick={handleTabClick} tabs={tabs} />
      <section
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="px-4 py-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {renderActivePanel({ activeTab, data, labels, artistId, isLoggedIn })}
      </section>
    </>
  );
}
