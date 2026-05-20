// @client-reason: dynamic import for reviews
"use client";

import { lazy, Suspense } from "react";
import Link from "next/link";
import type { PortfolioWithMedia, ReviewWithUser, BeforeAfterPhoto } from "@/lib/supabase/queries";
import { PortfolioTabContent } from "./PortfolioTabContent";
import { BeforeAfterTabContent } from "./BeforeAfterTabContent";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShopTabId } from "./ShopTabsNav";

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

interface ArtistDetailTabsProps {
  activeTab: ShopTabId;
  portfolios: PortfolioWithMedia[];
  reviews: ReviewWithUser[];
  beforeAfterPhotos: BeforeAfterPhoto[];
  totalCountLabel: string;
  noPortfolioMessage: string;
  noReviewsMessage: string;
  gridViewLabel?: string;
  listViewLabel?: string;
  artistId: string;
  writeReviewLabel?: string;
  isLoggedIn?: boolean;
  noBeforeAfterMessage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  beforeAfterCountLabel?: string;
}

function WriteReviewLink({ artistId, label }: Readonly<{ artistId: string; label: string }>): React.ReactElement {
  return (
    <div className="mb-3 flex justify-end">
      <Link
        href={`/reviews/write?id=${encodeURIComponent(artistId)}`}
        className="text-sm font-medium text-brand-primary transition-colors hover:text-brand-primary-hover focus-visible:rounded focus-visible:text-brand-primary-hover focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {label}
      </Link>
    </div>
  );
}

function renderTabPanel(
  activeTab: ShopTabId,
  props: Readonly<ArtistDetailTabsProps>,
): React.ReactNode {
  if (activeTab === "portfolio") {
    return (
      <PortfolioTabContent
        portfolios={props.portfolios}
        totalCountLabel={props.totalCountLabel}
        emptyMessage={props.noPortfolioMessage}
        gridViewLabel={props.gridViewLabel ?? "Grid view"}
        listViewLabel={props.listViewLabel ?? "List view"}
      />
    );
  }
  if (activeTab === "beforeAfter") {
    return (
      <BeforeAfterTabContent
        photos={props.beforeAfterPhotos}
        totalCountLabel={props.beforeAfterCountLabel ?? "총 0개"}
        emptyMessage={props.noBeforeAfterMessage ?? "시술 전후 사진이 없습니다"}
        beforeLabel={props.beforeLabel ?? "시술 전"}
        afterLabel={props.afterLabel ?? "시술 후"}
      />
    );
  }
  return (
    <Suspense fallback={<ReviewsSkeleton />}>
      <ReviewList reviews={props.reviews} emptyMessage={props.noReviewsMessage} />
    </Suspense>
  );
}

export function ArtistDetailTabs(props: Readonly<ArtistDetailTabsProps>): React.ReactElement {
  const { activeTab, artistId, writeReviewLabel = "리뷰 작성", isLoggedIn = false } = props;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${activeTab}`}
      aria-labelledby={`tab-${activeTab}`}
      className="px-4 py-4"
    >
      {activeTab === "reviews" && isLoggedIn ? (
        <WriteReviewLink artistId={artistId} label={writeReviewLabel} />
      ) : null}
      {renderTabPanel(activeTab, props)}
    </div>
  );
}
