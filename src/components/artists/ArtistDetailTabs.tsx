// @client-reason: Tab state management, dynamic import for reviews
"use client";

import { useState, lazy, Suspense } from "react";
import Link from "next/link";
import type { PortfolioWithMedia, ReviewWithUser, BeforeAfterPhoto } from "@/lib/supabase/queries";
import { PortfolioTabContent } from "./PortfolioTabContent";
import { BeforeAfterTabContent } from "./BeforeAfterTabContent";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamic import for ReviewList (includes date-fns) - only loads when reviews tab is clicked
const ReviewList = lazy(() =>
  import("@/components/reviews/ReviewList").then((mod) => ({ default: mod.ReviewList }))
);

function ReviewsSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={`review-skeleton-${i.toString()}`} className="rounded-lg border p-4">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/* eslint-disable max-lines-per-function, complexity */
interface ArtistDetailTabsProps {
  portfolios: PortfolioWithMedia[];
  portfolioLabel: string;
  reviewsLabel: string;
  totalCountLabel: string;
  noPortfolioMessage: string;
  noReviewsMessage: string;
  reviews: ReviewWithUser[];
  tabsAriaLabel?: string;
  gridViewLabel?: string;
  listViewLabel?: string;
  artistId: string;
  writeReviewLabel?: string;
  isLoggedIn?: boolean;
  beforeAfterPhotos: BeforeAfterPhoto[];
  beforeAfterLabel?: string;
  noBeforeAfterMessage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  beforeAfterCountLabel?: string;
  portfolioCount?: number;
  beforeAfterCount?: number;
  reviewCount?: number;
}

export function ArtistDetailTabs({
  portfolios,
  portfolioLabel,
  reviewsLabel,
  totalCountLabel,
  noPortfolioMessage,
  noReviewsMessage,
  reviews,
  tabsAriaLabel = "Artist info",
  gridViewLabel = "Grid view",
  listViewLabel = "List view",
  artistId,
  writeReviewLabel = "리뷰 작성",
  isLoggedIn = false,
  beforeAfterPhotos,
  beforeAfterLabel = "시술 전후",
  noBeforeAfterMessage = "시술 전후 사진이 없습니다",
  beforeLabel = "시술 전",
  afterLabel = "시술 후",
  beforeAfterCountLabel = "총 0개",
  portfolioCount,
  beforeAfterCount,
  reviewCount,
}: Readonly<ArtistDetailTabsProps>): React.ReactElement {
  const [activeTab, setActiveTab] = useState<"portfolio" | "beforeAfter" | "reviews">("portfolio");

  const tabButtonClass = (isActive: boolean): string =>
    `relative px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring ${
      isActive
        ? "font-semibold text-foreground"
        : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"
    }`;

  const portfolioTabLabel = portfolioCount !== undefined
    ? `${portfolioLabel} (${portfolioCount.toLocaleString()})`
    : portfolioLabel;
  const beforeAfterTabLabel = beforeAfterCount !== undefined
    ? `${beforeAfterLabel} (${beforeAfterCount.toLocaleString()})`
    : beforeAfterLabel;
  const reviewsTabLabel = reviewCount !== undefined
    ? `${reviewsLabel} (${reviewCount.toLocaleString()})`
    : reviewsLabel;

  return (
    <section>
      {/* Tab Navigation - Sticky Underline Style */}
      <div
        className="sticky top-12 z-40 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
        role="tablist"
        aria-label={tabsAriaLabel}
      >
        <button
          type="button"
          onClick={() => setActiveTab("portfolio")}
          className={tabButtonClass(activeTab === "portfolio")}
          aria-selected={activeTab === "portfolio"}
          aria-controls="tabpanel-portfolio"
          id="tab-portfolio"
          role="tab"
          tabIndex={activeTab === "portfolio" ? 0 : -1}
        >
          {portfolioTabLabel}
          {activeTab === "portfolio" && (
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("beforeAfter")}
          className={tabButtonClass(activeTab === "beforeAfter")}
          aria-selected={activeTab === "beforeAfter"}
          aria-controls="tabpanel-beforeAfter"
          id="tab-beforeAfter"
          role="tab"
          tabIndex={activeTab === "beforeAfter" ? 0 : -1}
        >
          {beforeAfterTabLabel}
          {activeTab === "beforeAfter" && (
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reviews")}
          className={tabButtonClass(activeTab === "reviews")}
          aria-selected={activeTab === "reviews"}
          aria-controls="tabpanel-reviews"
          id="tab-reviews"
          role="tab"
          tabIndex={activeTab === "reviews" ? 0 : -1}
        >
          {reviewsTabLabel}
          {activeTab === "reviews" && (
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" />
          )}
        </button>
        {isLoggedIn && (
          <Link
            href={`/reviews/write?id=${artistId}`}
            className="ml-auto px-3 py-3 text-sm font-medium text-brand-primary transition-colors hover:text-brand-primary-hover focus-visible:bg-muted focus-visible:text-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {writeReviewLabel}
          </Link>
        )}
      </div>

      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="px-4 py-4"
      >
        {activeTab === "portfolio" && (
          <PortfolioTabContent
            portfolios={portfolios}
            totalCountLabel={totalCountLabel}
            emptyMessage={noPortfolioMessage}
            gridViewLabel={gridViewLabel}
            listViewLabel={listViewLabel}
          />
        )}
        {activeTab === "beforeAfter" && (
          <BeforeAfterTabContent
            photos={beforeAfterPhotos}
            totalCountLabel={beforeAfterCountLabel}
            emptyMessage={noBeforeAfterMessage}
            beforeLabel={beforeLabel}
            afterLabel={afterLabel}
          />
        )}
        {activeTab === "reviews" && (
          <Suspense fallback={<ReviewsSkeleton />}>
            <ReviewList reviews={reviews} emptyMessage={noReviewsMessage} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
