// @client-reason: Custom hook using React Query + useSearchParams for artist search with infinite scroll
"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInfiniteScroll } from "./useInfiniteScroll";
import type { ArtistListItem } from "@/lib/supabase/artist-queries";

const ARTIST_PAGE_SIZE = 20;

interface ArtistSearchResult {
  artists: ArtistListItem[];
  totalCount: number;
  regionName: string | null;
}

type ArtistType = "SEMI_PERMANENT";

function buildApiUrl(offset: number, typeArtist: ArtistType, regionId: string | null, regionSido: string | null, searchWord: string): string {
  const params = new URLSearchParams();
  params.set("typeArtist", typeArtist);
  params.set("offset", String(offset));
  params.set("limit", String(ARTIST_PAGE_SIZE));
  if (regionId) params.set("regionId", regionId);
  if (regionSido) params.set("regionSido", regionSido);
  if (searchWord) params.set("searchWord", searchWord);
  return `/api/artists/search?${params.toString()}`;
}

async function fetchArtistPage(
  typeArtist: ArtistType,
  regionId: string | null,
  regionSido: string | null,
  searchWord: string,
  offset: number,
): Promise<ArtistSearchResult> {
  const res = await fetch(buildApiUrl(offset, typeArtist, regionId, regionSido, searchWord));
  if (!res.ok) throw new Error(`Artist search failed: ${String(res.status)}`);
  return res.json() as Promise<ArtistSearchResult>;
}

interface SearchFilters {
  regionId: string | null;
  regionSido: string | null;
  typeArtist: ArtistType;
  searchWord: string;
  isDefault: boolean;
}

function parseSearchFilters(searchParams: URLSearchParams): SearchFilters {
  const regionId = searchParams.get("region") || null;
  const regionSido = searchParams.get("regionSido") || null;
  const typeArtist: ArtistType = "SEMI_PERMANENT";
  const searchWord = searchParams.get("q") ?? "";
  const isDefault = !regionId && !regionSido && !searchWord;
  return { regionId, regionSido, typeArtist, searchWord, isDefault };
}

function buildInitialData(artists: ArtistListItem[], totalCount: number): {
  pages: ArtistSearchResult[];
  pageParams: number[];
} {
  return { pages: [{ artists, totalCount, regionName: null }], pageParams: [0] };
}

interface UseArtistSearchReturn {
  artists: ArtistListItem[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  regionId: string | null;
  regionSido: string | null;
  typeArtist: ArtistType;
}

export function useArtistSearch(
  initialArtists: ArtistListItem[],
  initialTotalCount: number,
): UseArtistSearchReturn {
  const searchParams = useSearchParams();
  const filters = parseSearchFilters(searchParams);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["artists", filters.typeArtist, filters.regionId, filters.regionSido, filters.searchWord],
    queryFn: ({ pageParam = 0 }) =>
      fetchArtistPage(filters.typeArtist, filters.regionId, filters.regionSido, filters.searchWord, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.artists.length, 0);
      return loaded < lastPage.totalCount ? loaded : undefined;
    },
    ...(filters.isDefault ? { initialData: buildInitialData(initialArtists, initialTotalCount) } : {}),
  });

  const artists = useMemo(() => data?.pages.flatMap((p) => p.artists) ?? [], [data]);
  const totalCount = data?.pages[0]?.totalCount ?? initialTotalCount;

  const loadMore = useCallback((): void => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore: hasNextPage ?? false,
    isLoading: isFetchingNextPage,
  });

  return { artists, totalCount, isLoading, isLoadingMore: isFetchingNextPage, sentinelRef, regionId: filters.regionId, regionSido: filters.regionSido, typeArtist: filters.typeArtist };
}
