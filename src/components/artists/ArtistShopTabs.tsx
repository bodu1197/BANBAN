// @client-reason: useState for activeTab in shop tabs navigation
"use client";

import { useState } from "react";
import { STRINGS } from "@/lib/strings";
import type { PortfolioWithMedia, ReviewWithUser, BeforeAfterPhoto } from "@/lib/supabase/queries";
import type { EventCardData } from "@/lib/supabase/event-queries";
import { ShopTabsNav, type ShopTabId } from "./ShopTabsNav";
import { ArtistDetailTabs } from "./ArtistDetailTabs";

interface ArtistShopTabsProps {
  events: EventCardData[];
  portfolios: PortfolioWithMedia[];
  reviews: ReviewWithUser[];
  beforeAfterPhotos: BeforeAfterPhoto[];
  eventCount: number;
  portfolioCount: number;
  beforeAfterCount: number;
  reviewCount: number;
  artistId: string;
  isLoggedIn: boolean;
  stickyTopClass?: string;
}

export function ArtistShopTabs({
  events,
  portfolios,
  reviews,
  beforeAfterPhotos,
  eventCount,
  portfolioCount,
  beforeAfterCount,
  reviewCount,
  artistId,
  isLoggedIn,
  stickyTopClass,
}: Readonly<ArtistShopTabsProps>): React.ReactElement {
  const [activeTab, setActiveTab] = useState<ShopTabId>("events");

  const tabs: ReadonlyArray<{ id: ShopTabId; label: string; count: number }> = [
    { id: "events", label: STRINGS.artist.events, count: eventCount },
    { id: "portfolio", label: STRINGS.artist.portfolio, count: portfolioCount },
    { id: "beforeAfter", label: STRINGS.artist.beforeAfter, count: beforeAfterCount },
    { id: "reviews", label: STRINGS.artist.reviews, count: reviewCount },
  ];

  return (
    <>
      <ShopTabsNav activeTab={activeTab} onTabClick={setActiveTab} tabs={tabs} className={stickyTopClass} />
      <ArtistDetailTabs
        activeTab={activeTab}
        events={events}
        portfolios={portfolios}
        reviews={reviews}
        beforeAfterPhotos={beforeAfterPhotos}
        totalCountLabel={STRINGS.artist.totalCount.replace("{count}", String(portfolios.length))}
        noPortfolioMessage={STRINGS.artist.noPortfolio}
        noReviewsMessage={STRINGS.artist.noReviews}
        noBeforeAfterMessage={STRINGS.artist.noBeforeAfter}
        noEventsMessage={STRINGS.artist.noEvents}
        beforeAfterCountLabel={STRINGS.artist.beforeAfterCount.replace("{count}", String(beforeAfterPhotos.length))}
        gridViewLabel={STRINGS.common.gridView}
        listViewLabel={STRINGS.common.listView}
        beforeLabel={STRINGS.artist.beforeLabel}
        afterLabel={STRINGS.artist.afterLabel}
        artistId={artistId}
        writeReviewLabel={STRINGS.review.writeReview}
        isLoggedIn={isLoggedIn}
      />
    </>
  );
}
