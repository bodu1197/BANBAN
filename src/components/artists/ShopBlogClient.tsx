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

// 모든 탭이 비었을 때(예: 미리보기 draft) 남길 앵커 탭 + 기본 탭 폴백. 공개 샵은 포폴 ≥5라 항상 채워짐.
const ANCHOR_TAB_ID: ShopTabId = "portfolio";

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

type ShopTab = { id: ShopTabId; label: string; count: number };

// 노출 탭(데이터>0)과 기본 탭 계산 — 컴포넌트 복잡도 분리.
// 빈 탭은 숨겨(빈 페이지 방지), 전부 비면 포트폴리오를 앵커로. 기본 탭은 URL 지정(데이터 있을 때만) 아니면 첫 노출 탭.
function resolveTabs(
  counts: ShopBlogCounts, labels: ShopBlogLabels, tabParam: string | null,
): { tabs: ReadonlyArray<ShopTab>; initialTab: ShopTabId } {
  const allTabs: ReadonlyArray<ShopTab> = [
    { id: "events", label: labels.events, count: counts.events },
    { id: "portfolio", label: labels.portfolio, count: counts.portfolios },
    { id: "beforeAfter", label: labels.beforeAfter, count: counts.beforeAfter },
    { id: "reviews", label: labels.reviews, count: counts.reviews },
  ];
  const nonEmpty = allTabs.filter((t) => t.count > 0);
  const tabs = nonEmpty.length > 0 ? nonEmpty : allTabs.filter((t) => t.id === ANCHOR_TAB_ID);
  const firstTabId: ShopTabId = tabs[0]?.id ?? ANCHOR_TAB_ID;
  const initialTab: ShopTabId =
    isShopTabId(tabParam) && tabs.some((t) => t.id === tabParam) ? tabParam : firstTabId;
  return { tabs, initialTab };
}

// 탭 패널 — 탭이 둘 이상이면 tabpanel(탭바와 연결), 하나뿐이면 단독 region. activeTab 은 항상 노출 탭 안.
function TabPanel({ activeTab, hasTabs, soleLabel, children }: Readonly<{
  activeTab: ShopTabId; hasTabs: boolean; soleLabel: string; children: React.ReactNode;
}>): React.ReactElement {
  return (
    <section
      id={`tabpanel-${activeTab}`}
      role={hasTabs ? "tabpanel" : "region"}
      aria-labelledby={hasTabs ? `tab-${activeTab}` : undefined}
      aria-label={hasTabs ? undefined : soleLabel}
      tabIndex={0}
      className="min-h-[calc(100vh-7rem)] px-4 py-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </section>
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
  const { tabs, initialTab } = resolveTabs(counts, labels, tabParam);
  const [activeTab, setActiveTab] = useState<ShopTabId>(initialTab);
  const tablistRef = useRef<HTMLDivElement>(null);
  const scrollToTopOnNextRenderRef = useRef(false);

  const handleTabClick = useCallback((tab: ShopTabId): void => {
    scrollToTopOnNextRenderRef.current = true;
    setActiveTab(tab);
  }, []);

  // 탭 클릭 시 panel 첫 부분을 sticky 영역 바로 아래로 scroll.
  // tabpanel section 의 min-h-[calc(100vh-7rem)] 이 페이지를 충분히 길게 만들어 scrollBy 가 clamp 되지 않음.
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

  // 노출 탭이 하나뿐이면(예: 포폴만 있는 샵) 탭바는 군더더기 → 숨기고 콘텐츠를 바로 보여준다.
  const showTabs = tabs.length > 1;

  return (
    <>
      {hero}
      {showTabs ? <ShopTabsNav ref={tablistRef} activeTab={activeTab} onTabClick={handleTabClick} tabs={tabs} /> : null}
      <TabPanel activeTab={activeTab} hasTabs={showTabs} soleLabel={tabs[0]?.label ?? ""}>
        {renderActivePanel({ activeTab, data, labels, artistId, isLoggedIn })}
      </TabPanel>
    </>
  );
}
