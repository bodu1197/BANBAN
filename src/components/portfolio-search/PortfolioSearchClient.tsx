// @client-reason: Interactive filters, infinite scroll, dynamic API fetching
"use client";

import { useState, useEffect, Suspense } from "react";
import { STRINGS } from "@/lib/strings";
import type { ActiveAdArtist } from "@/types/ads";
import { usePortfolioFilters } from "@/hooks/usePortfolioFilters";
import type { HomePortfolio } from "@/lib/supabase/home-queries";
import type { Region } from "@/types/database";
import type { CategoryItem } from "@/types/portfolio-search";
import { PortfolioFilterControls } from "./FilterControls";
import { PortfolioGrid, PortfolioSkeleton } from "./PortfolioGrid";
import { usePortfolioSearch } from "./usePortfolioSearch";

interface PortfolioSearchClientProps {
  initialData: HomePortfolio[];
  initialTotalCount: number;
  typeArtist: "TATTOO" | "SEMI_PERMANENT";
  categories: CategoryItem[];
  regions: Region[];
  targetGender?: "MALE" | "FEMALE" | null;
  initialCategoryIds?: string[];
}

// --- Main component ---

function PortfolioSearchInner({
  initialData, initialTotalCount, typeArtist, categories, regions, targetGender, initialCategoryIds,
}: Readonly<PortfolioSearchClientProps>): React.ReactElement {
  const d = STRINGS.portfolioSearch;
  const isBeautyPage = !!targetGender;
  const { filters, setRegions, setCategoryIds, setPriceMax, resetFilters, hasActiveFilters } =
    usePortfolioFilters(initialCategoryIds);
  const { portfolios, isLoading, isLoadingMore, sentinelRef } =
    usePortfolioSearch(initialData, initialTotalCount, typeArtist, hasActiveFilters, filters, targetGender);

  // Fetch active ad artists + portfolio slots
  const [adArtistIds, setAdArtistIds] = useState<Set<string>>(new Set());
  const [adPortfolioIds, setAdPortfolioIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch("/api/ads/active")
      .then(r => r.json())
      .then((data: { activeAds?: ActiveAdArtist[] }) => {
        const ads = data.activeAds ?? [];
        const artistsWithNoSlots = new Set(ads.filter(a => a.portfolio_ids.length === 0).map(a => a.artist_id));
        const portfolioIds = new Set(ads.flatMap(a => a.portfolio_ids));
        setAdArtistIds(artistsWithNoSlots);
        setAdPortfolioIds(portfolioIds);
      })
      .catch(() => { /* silently ignore */ });
  }, []);

  return (
    <div className="mx-auto w-full max-w-[767px]">
      <PortfolioFilterControls
        categories={categories} regions={regions} d={d}
        filters={filters} setRegions={setRegions} setCategoryIds={setCategoryIds} setPriceMax={setPriceMax}
        resetFilters={resetFilters} hasActiveFilters={hasActiveFilters}
        isBeautyPage={isBeautyPage}
      />
      <div className="px-4 pb-2">
        <h3 className="text-base font-bold">{d.popularInfo}</h3>
      </div>

      <PortfolioGrid portfolios={portfolios} noResults={d.noResults} isLoading={isLoading} adArtistIds={adArtistIds} adPortfolioIds={adPortfolioIds} />

      {isLoadingMore && (
        <div className="flex items-center justify-center py-6">
          <p className="text-sm text-muted-foreground">...</p>
        </div>
      )}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}

export function PortfolioSearchClient(
  props: Readonly<PortfolioSearchClientProps>,
): React.ReactElement {
  return (
    <Suspense fallback={<PortfolioSkeleton />}>
      <PortfolioSearchInner {...props} />
    </Suspense>
  );
}
