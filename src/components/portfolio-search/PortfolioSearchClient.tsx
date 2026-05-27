// @client-reason: Interactive filters, infinite scroll
"use client";

import { Suspense } from "react";
import { STRINGS } from "@/lib/strings";
import { usePortfolioFilters } from "@/hooks/usePortfolioFilters";
import { useImpressionTracker } from "@/hooks/useImpressionTracker";
import type { HomePortfolio } from "@/lib/supabase/home-queries";
import type { Region } from "@/types/database";
import type { CategoryItem } from "@/types/portfolio-search";
import { PortfolioFilterControls } from "./FilterControls";
import { PortfolioGrid, PortfolioSkeleton } from "./PortfolioGrid";
import { usePortfolioSearch } from "./usePortfolioSearch";

interface PortfolioSearchClientProps {
  initialData: HomePortfolio[];
  initialTotalCount: number;
  typeArtist: "SEMI_PERMANENT";
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
  const impressionRef = useImpressionTracker("search");

  return (
    <div ref={impressionRef} className="mx-auto w-full max-w-[1024px]">
      <PortfolioFilterControls
        categories={categories} regions={regions} d={d}
        filters={filters} setRegions={setRegions} setCategoryIds={setCategoryIds} setPriceMax={setPriceMax}
        resetFilters={resetFilters} hasActiveFilters={hasActiveFilters}
        isBeautyPage={isBeautyPage}
      />
      <div className="px-4 pb-2">
        <h3 className="text-base font-bold">{d.popularInfo}</h3>
      </div>

      <PortfolioGrid portfolios={portfolios} noResults={d.noResults} isLoading={isLoading} />

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
