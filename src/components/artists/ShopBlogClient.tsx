// @client-reason: activeTab 기반 단일 탭 렌더 + sticky 탭 nav. 한 번에 한 탭의 콘텐츠만 노출.
"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { PortfolioWithMedia, ReviewWithUser, BeforeAfterPhoto } from "@/lib/supabase/queries";
import type { EventCardData } from "@/lib/supabase/event-queries";
import { EventCard } from "@/components/event/EventCard";
import { ShopTabsNav, type ShopTabId } from "./ShopTabsNav";
import { PortfolioTabContent } from "./PortfolioTabContent";
import { BeforeAfterTabContent } from "./BeforeAfterTabContent";
import { ReviewList } from "@/components/reviews/ReviewList";

const VALID_TABS: ReadonlySet<string> = new Set<ShopTabId>([
  "home",
  "events",
  "portfolio",
  "beforeAfter",
  "reviews",
]);

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
  if (activeTab === "home") {
    return <EmptyMessage message="샵 정보를 확인하세요" />;
  }
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
  const initialTab: ShopTabId =
    tabParam !== null && VALID_TABS.has(tabParam) ? (tabParam as ShopTabId) : "events";
  const [activeTab, setActiveTab] = useState<ShopTabId>(initialTab);

  const handleTabClick = useCallback((tab: ShopTabId): void => {
    setActiveTab(tab);
  }, []);

  const tabs: ReadonlyArray<{ id: ShopTabId; label: string; count?: number }> = [
    { id: "home", label: "홈" },
    { id: "events", label: labels.events, count: counts.events },
    { id: "portfolio", label: labels.portfolio, count: counts.portfolios },
    { id: "beforeAfter", label: labels.beforeAfter, count: counts.beforeAfter },
    { id: "reviews", label: labels.reviews, count: counts.reviews },
  ];

  return (
    <>
      {hero}
      <ShopTabsNav activeTab={activeTab} onTabClick={handleTabClick} tabs={tabs} />
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
