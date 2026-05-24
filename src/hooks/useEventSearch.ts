// @client-reason: React Query + useSearchParams 기반 events 검색 + 무한 스크롤
"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInfiniteScroll } from "./useInfiniteScroll";
import type { EventCardData, EventSearchResult } from "@/lib/supabase/event-queries";

const EVENT_PAGE_SIZE = 20;

function buildApiUrl(offset: number, regionId: string | null, regionSido: string | null): string {
  const params = new URLSearchParams();
  params.set("offset", String(offset));
  params.set("limit", String(EVENT_PAGE_SIZE));
  if (regionId) params.set("regionId", regionId);
  if (regionSido) params.set("regionSido", regionSido);
  return `/api/events/search?${params.toString()}`;
}

async function fetchEventPage(
  regionId: string | null,
  regionSido: string | null,
  offset: number,
): Promise<EventSearchResult> {
  const res = await fetch(buildApiUrl(offset, regionId, regionSido));
  if (!res.ok) throw new Error(`Event search failed: ${String(res.status)}`);
  return res.json() as Promise<EventSearchResult>;
}

interface SearchFilters {
  regionId: string | null;
  regionSido: string | null;
  isDefault: boolean;
}

function parseSearchFilters(searchParams: URLSearchParams): SearchFilters {
  const regionId = searchParams.get("region") || null;
  const regionSido = searchParams.get("regionSido") || null;
  return { regionId, regionSido, isDefault: !regionId && !regionSido };
}

function buildInitialData(events: EventCardData[], totalCount: number): {
  pages: EventSearchResult[];
  pageParams: number[];
} {
  return { pages: [{ events, totalCount }], pageParams: [0] };
}

interface UseEventSearchReturn {
  events: EventCardData[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  regionId: string | null;
  regionSido: string | null;
}

export function useEventSearch(
  initialEvents: EventCardData[],
  initialTotalCount: number,
): UseEventSearchReturn {
  const searchParams = useSearchParams();
  const filters = parseSearchFilters(searchParams);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["events", filters.regionId, filters.regionSido],
    queryFn: ({ pageParam = 0 }) =>
      fetchEventPage(filters.regionId, filters.regionSido, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.events.length, 0);
      return loaded < lastPage.totalCount ? loaded : undefined;
    },
    staleTime: 5 * 60 * 1000,
    ...(filters.isDefault ? { initialData: buildInitialData(initialEvents, initialTotalCount) } : {}),
  });

  const events = useMemo(() => data?.pages.flatMap((p) => p.events) ?? [], [data]);
  const totalCount = data?.pages[0]?.totalCount ?? initialTotalCount;

  const loadMore = useCallback((): void => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore: hasNextPage ?? false,
    isLoading: isFetchingNextPage,
  });

  return {
    events,
    totalCount,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    sentinelRef,
    regionId: filters.regionId,
    regionSido: filters.regionSido,
  };
}
