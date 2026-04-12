// @client-reason: React Query infinite query hook for client-side portfolio fetching
"use client";

import { useCallback, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { PAGE_SIZE } from "@/lib/constants";
import type { HomePortfolio } from "@/lib/supabase/home-queries";
import type { PortfolioSearchResult } from "@/types/portfolio-search";
import type { PortfolioFilters } from "@/hooks/usePortfolioFilters";

function buildApiParams(typeArtist: string, filters: PortfolioFilters, offset: number, targetGender?: "MALE" | "FEMALE" | null): URLSearchParams {
  const params = new URLSearchParams();
  params.set("typeArtist", typeArtist);
  params.set("offset", String(offset));
  params.set("limit", String(PAGE_SIZE));
  if (targetGender) params.set("targetGender", targetGender);
  if (filters.regionId) params.set("regionId", filters.regionId);
  if (filters.regionSido) params.set("regionSido", filters.regionSido);
  if (filters.categoryIds.length > 0) params.set("categoryIds", filters.categoryIds.join(","));
  if (filters.searchWord) params.set("q", filters.searchWord);
  if (filters.sort !== "random") params.set("sort", filters.sort);
  if (filters.priceMax > 0) params.set("priceMax", String(filters.priceMax));
  return params;
}

async function fetchPortfolioPage(typeArtist: string, filters: PortfolioFilters, offset: number, targetGender?: "MALE" | "FEMALE" | null): Promise<PortfolioSearchResult> {
  const p = buildApiParams(typeArtist, filters, offset, targetGender);
  const res = await fetch(`/api/portfolios/search?${p.toString()}`);
  if (!res.ok) throw new Error(`Portfolio search failed: ${String(res.status)}`);
  return res.json() as Promise<PortfolioSearchResult>;
}

export interface UsePortfolioSearchResult {
  portfolios: HomePortfolio[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function usePortfolioSearch(
  initialData: HomePortfolio[],
  initialTotalCount: number,
  typeArtist: string,
  hasActiveFilters: boolean,
  filters: PortfolioFilters,
  targetGender?: "MALE" | "FEMALE" | null,
): UsePortfolioSearchResult {
  const filterKey = `${filters.regionId ?? ""}_${filters.regionSido ?? ""}_${filters.categoryIds.join(",")}_${filters.searchWord}_${filters.sort}_${filters.priceMax}`;

  // Only use SSR initialData when no filters are active.
  // When filters change, React Query fetches fresh data from the API.
  const noFilterInitial = hasActiveFilters
    ? undefined
    : { pages: [{ portfolios: initialData, totalCount: initialTotalCount }], pageParams: [0] };

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["portfolios", typeArtist, targetGender ?? "all", filterKey],
    queryFn: ({ pageParam = 0 }) => fetchPortfolioPage(typeArtist, filters, pageParam as number, targetGender),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.portfolios.length, 0);
      return loaded < lastPage.totalCount ? loaded : undefined;
    },
    initialData: noFilterInitial,
  });

  const portfolios = useMemo(
    () => data?.pages.flatMap((p) => p.portfolios) ?? [],
    [data],
  );
  const totalCount = data?.pages[0]?.totalCount ?? initialTotalCount;

  const loadMore = useCallback((): void => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore: hasNextPage ?? false,
    isLoading: isFetchingNextPage,
  });

  return { portfolios, totalCount, isLoading, isLoadingMore: isFetchingNextPage, sentinelRef };
}
