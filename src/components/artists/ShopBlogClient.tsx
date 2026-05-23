// @client-reason: activeTab useState 관리 — sticky tabs nav + hero (서버 렌더 children) + tab content 통합
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PortfolioWithMedia, ReviewWithUser, BeforeAfterPhoto } from "@/lib/supabase/queries";
import type { EventCardData } from "@/lib/supabase/event-queries";
import { ShopTabsNav, type ShopTabId } from "./ShopTabsNav";
import { ArtistDetailTabs } from "./ArtistDetailTabs";

const VALID_TABS: ReadonlySet<string> = new Set<ShopTabId>(["home", "events", "portfolio", "beforeAfter", "reviews"]);

/** 30개 individual props 를 3개 도메인 객체 (data / counts / labels) + 단일 값으로 그룹화 */
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
  const initialTab = searchParams.get("tab") ?? "home";
  const [activeTab, setActiveTab] = useState<ShopTabId>(
    VALID_TABS.has(initialTab) ? (initialTab as ShopTabId) : "home",
  );

  const tabs: ReadonlyArray<{ id: ShopTabId; label: string; count?: number }> = [
    { id: "home", label: "홈" },
    { id: "events", label: eventsLabel, count: eventCount },
    { id: "portfolio", label: portfolioLabel, count: portfolioCount },
    { id: "beforeAfter", label: beforeAfterLabel, count: beforeAfterCount },
    { id: "reviews", label: reviewsLabel, count: reviewCount },
  ];

  return (
    <>
      <ShopTabsNav activeTab={activeTab} onTabClick={setActiveTab} tabs={tabs} />
      {activeTab === "home" ? hero : null}
      <ArtistDetailTabs
        activeTab={activeTab}
        events={events}
        portfolios={portfolios}
        reviews={reviews}
        beforeAfterPhotos={beforeAfterPhotos}
        totalCountLabel={totalCountLabel}
        noPortfolioMessage={noPortfolioMessage}
        noReviewsMessage={noReviewsMessage}
        noBeforeAfterMessage={noBeforeAfterMessage}
        noEventsMessage={noEventsMessage}
        beforeAfterCountLabel={beforeAfterCountLabel}
        gridViewLabel={gridViewLabel}
        listViewLabel={listViewLabel}
        beforeLabel={beforeLabel}
        afterLabel={afterLabel}
        artistId={artistId}
        writeReviewLabel={writeReviewLabel}
        isLoggedIn={isLoggedIn}
      />
    </>
  );
}
