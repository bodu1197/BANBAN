// @client-reason: activeTab useState 관리 — sticky tabs nav + hero (서버 렌더 children) + tab content 통합
"use client";

import { useState } from "react";
import type { PortfolioWithMedia, ReviewWithUser, BeforeAfterPhoto } from "@/lib/supabase/queries";
import { ShopTabsNav, type ShopTabId } from "./ShopTabsNav";
import { ArtistDetailTabs } from "./ArtistDetailTabs";

interface ShopBlogClientProps {
  hero: React.ReactNode;
  portfolios: PortfolioWithMedia[];
  reviews: ReviewWithUser[];
  beforeAfterPhotos: BeforeAfterPhoto[];
  portfolioCount: number;
  beforeAfterCount: number;
  reviewCount: number;
  totalCountLabel: string;
  noPortfolioMessage: string;
  noReviewsMessage: string;
  noBeforeAfterMessage: string;
  beforeAfterCountLabel: string;
  gridViewLabel: string;
  listViewLabel: string;
  beforeLabel: string;
  afterLabel: string;
  portfolioLabel: string;
  beforeAfterLabel: string;
  reviewsLabel: string;
  writeReviewLabel: string;
  artistId: string;
  isLoggedIn: boolean;
}

export function ShopBlogClient({
  hero,
  portfolios,
  reviews,
  beforeAfterPhotos,
  portfolioCount,
  beforeAfterCount,
  reviewCount,
  totalCountLabel,
  noPortfolioMessage,
  noReviewsMessage,
  noBeforeAfterMessage,
  beforeAfterCountLabel,
  gridViewLabel,
  listViewLabel,
  beforeLabel,
  afterLabel,
  portfolioLabel,
  beforeAfterLabel,
  reviewsLabel,
  writeReviewLabel,
  artistId,
  isLoggedIn,
}: Readonly<ShopBlogClientProps>): React.ReactElement {
  const [activeTab, setActiveTab] = useState<ShopTabId>("portfolio");

  const tabs = [
    { id: "portfolio" as const, label: portfolioLabel, count: portfolioCount },
    { id: "beforeAfter" as const, label: beforeAfterLabel, count: beforeAfterCount },
    { id: "reviews" as const, label: reviewsLabel, count: reviewCount },
  ];

  return (
    <>
      <ShopTabsNav activeTab={activeTab} onTabClick={setActiveTab} tabs={tabs} />
      {hero}
      <ArtistDetailTabs
        activeTab={activeTab}
        portfolios={portfolios}
        reviews={reviews}
        beforeAfterPhotos={beforeAfterPhotos}
        totalCountLabel={totalCountLabel}
        noPortfolioMessage={noPortfolioMessage}
        noReviewsMessage={noReviewsMessage}
        noBeforeAfterMessage={noBeforeAfterMessage}
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
