// @client-reason: React Query hook for search fetching
"use client";

import { useCallback, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { HomePortfolio } from "@/lib/supabase/portfolio-common";
import { SEARCH_PAGE_SIZE, MIN_QUERY_LENGTH } from "@/lib/search-match";
// 타입 전용 import — 값이 아니므로 서버 모듈이 클라이언트 번들에 들어가지 않는다.
// 응답 계약을 손으로 복사하면 서버 필드가 바뀌어도 컴파일 에러가 안 난다.
import type { GlobalSearchResult, GlobalSearchArtist } from "@/lib/supabase/global-search-queries";

type ArtistResult = GlobalSearchArtist;
type SearchPage = GlobalSearchResult;

async function fetchSearchPage(query: string, offset: number): Promise<SearchPage> {
  const params = new URLSearchParams({
    q: query,
    offset: String(offset),
    limit: String(SEARCH_PAGE_SIZE),
  });
  const res = await fetch(`/api/search?${params.toString()}`);
  // res.ok 를 안 보면 500 응답이 빈 결과로 파싱돼 "검색 결과가 없습니다" 로 위장된다
  if (!res.ok) throw new Error(`Search failed: ${String(res.status)}`);
  return res.json() as Promise<SearchPage>;
}

export type { GlobalSearchArtist as ArtistResult };

export interface UseSearchFetchResult {
  portfolios: HomePortfolio[];
  artists: ArtistResult[];
  /** 매칭된 작품 총 수 — 탭 라벨은 화면에 그려진 개수가 아니라 이 값을 써야 거짓말하지 않는다 */
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  isError: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * offset 페이지네이션 — limit 을 키워 매번 전체를 다시 받던 방식은 (1) 이미 본 목록이 광고 회전과
 * 함께 갈아끼워지고 (2) 서버 상한을 넘는 순간 헛클릭이 나고 (3) 총 개수를 알 수 없었다.
 * 프로젝트의 목록 검색(usePortfolioSearch)이 쓰는 방식과 같다.
 */
export function useSearchFetch(query: string): UseSearchFetchResult {
  const { data, isLoading, isError, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["globalSearch", query],
    queryFn: ({ pageParam }) => fetchSearchPage(query, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // 광고 주입은 페이지 길이를 바꾸지 않는 재정렬이라 offset 은 받은 페이지 수로 계산하면 된다.
      // 빈 페이지가 오면 총계와 무관하게 멈춘다 — 안 그러면 눌러도 아무것도 안 붙는 버튼이 남는다.
      const nextOffset = allPages.length * SEARCH_PAGE_SIZE;
      return nextOffset < lastPage.totalCount && lastPage.portfolios.length > 0 ? nextOffset : undefined;
    },
    enabled: query.trim().length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
    // infinite query 는 stale 재마운트 시 로드된 페이지를 전부 순차 재요청한다(8페이지면 8왕복)
    refetchOnMount: false,
  });

  const portfolios = useMemo(() => data?.pages.flatMap((p) => p.portfolios) ?? [], [data]);

  const loadMore = useCallback((): void => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    portfolios,
    artists: data?.pages[0]?.artists ?? [],
    totalCount: data?.pages[0]?.totalCount ?? 0,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    isError,
    hasMore: hasNextPage,
    loadMore,
  };
}
