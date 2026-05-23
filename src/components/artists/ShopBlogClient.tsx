// @client-reason: activeTab useState 관리 — sticky tabs nav + hero (서버 렌더 children) + tab content 통합
"use client";

import { useState } from "react";
import type { PortfolioWithMedia, ReviewWithUser, BeforeAfterPhoto } from "@/lib/supabase/queries";
import type { EventCardData } from "@/lib/supabase/event-queries";
import { ShopTabsNav, type ShopTabId } from "./ShopTabsNav";
import { ArtistDetailTabs } from "./ArtistDetailTabs";

interface ShopBlogClientProps {
  hero: React.ReactNode;
  events: EventCardData[];
  portfolios: PortfolioWithMedia[];
  reviews: ReviewWithUser[];
  beforeAfterPhotos: BeforeAfterPhoto[];
  eventCount: number;
  portfolioCount: number;
  beforeAfterCount: number;
  reviewCount: number;
  totalCountLabel: string;
  noPortfolioMessage: string;
  noReviewsMessage: string;
  noBeforeAfterMessage: string;
  noEventsMessage: string;
  beforeAfterCountLabel: string;
  gridViewLabel: string;
  listViewLabel: string;
  beforeLabel: string;
  afterLabel: string;
  eventsLabel: string;
  portfolioLabel: string;
  beforeAfterLabel: string;
  reviewsLabel: string;
  writeReviewLabel: string;
  artistId: string;
  isLoggedIn: boolean;
}

export function ShopBlogClient({
  hero,
  events,
  portfolios,
  reviews,
  beforeAfterPhotos,
  eventCount,
  portfolioCount,
  beforeAfterCount,
  reviewCount,
  totalCountLabel,
  noPortfolioMessage,
  noReviewsMessage,
  noBeforeAfterMessage,
  noEventsMessage,
  beforeAfterCountLabel,
  gridViewLabel,
  listViewLabel,
  beforeLabel,
  afterLabel,
  eventsLabel,
  portfolioLabel,
  beforeAfterLabel,
  reviewsLabel,
  writeReviewLabel,
  artistId,
  isLoggedIn,
}: Readonly<ShopBlogClientProps>): React.ReactElement {
  const [activeTab, setActiveTab] = useState<ShopTabId>("home");

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
