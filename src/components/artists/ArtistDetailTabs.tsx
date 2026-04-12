// @client-reason: Tab state management, dynamic import for reviews
"use client";

import { useState, lazy, Suspense } from "react";
import Link from "next/link";
import type { PortfolioWithMedia, ReviewWithUser } from "@/lib/supabase/queries";
import { PortfolioTabContent } from "./PortfolioTabContent";
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
}: Readonly<ArtistDetailTabsProps>): React.ReactElement {
  const [activeTab, setActiveTab] = useState<"portfolio" | "reviews">("portfolio");

  return (
    <section className="px-4 py-4">
      {/* Tab Navigation - Underline Style */}
      <div className="mb-4 flex border-b" role="tablist" aria-label={tabsAriaLabel}>
        <button
          type="button"
          onClick={() => setActiveTab("portfolio")}
          className={`relative px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            activeTab === "portfolio"
              ? "text-brand-primary"
              : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"
          }`}
          aria-selected={activeTab === "portfolio"}
          aria-controls="tabpanel-portfolio"
          id="tab-portfolio"
          role="tab"
          tabIndex={activeTab === "portfolio" ? 0 : -1}
        >
          {portfolioLabel}
          {activeTab === "portfolio" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reviews")}
          className={`relative px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            activeTab === "reviews"
              ? "text-brand-primary"
              : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"
          }`}
          aria-selected={activeTab === "reviews"}
          aria-controls="tabpanel-reviews"
          id="tab-reviews"
          role="tab"
          tabIndex={activeTab === "reviews" ? 0 : -1}
        >
          {reviewsLabel}
          {activeTab === "reviews" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
          )}
        </button>
        {isLoggedIn && (
          <Link
            href={`/reviews/write?id=${artistId}`}
            className="relative px-4 py-2 text-sm font-medium text-brand-primary transition-colors hover:text-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {writeReviewLabel}
          </Link>
        )}
      </div>

      {/* Tab Content */}
      <div
        role="tabpanel"
        id={activeTab === "portfolio" ? "tabpanel-portfolio" : "tabpanel-reviews"}
        aria-labelledby={activeTab === "portfolio" ? "tab-portfolio" : "tab-reviews"}
      >
        {activeTab === "portfolio" ? (
          <PortfolioTabContent
            portfolios={portfolios}
            totalCountLabel={totalCountLabel}
            emptyMessage={noPortfolioMessage}
            gridViewLabel={gridViewLabel}
            listViewLabel={listViewLabel}
          />
        ) : (
          <Suspense fallback={<ReviewsSkeleton />}>
            <ReviewList reviews={reviews} emptyMessage={noReviewsMessage} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
