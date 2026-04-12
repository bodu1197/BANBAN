// @client-reason: React Query hook for search fetching
"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { HomePortfolio } from "@/lib/supabase/portfolio-common";

interface ArtistResult {
  id: string;
  name: string;
  profileImage: string | null;
  region: string | null;
  portfolioCount: number;
  isAd: boolean;
}

interface SearchData {
  portfolios: HomePortfolio[];
  artists: ArtistResult[];
  adArtistIds: string[];
  adPortfolioIds?: string[];
}

async function fetchSearchResults(query: string): Promise<SearchData> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  return res.json() as Promise<SearchData>;
}

export function useSearchFetch(query: string): {
  portfolios: HomePortfolio[];
  artists: ArtistResult[];
  adArtistIds: Set<string>;
  adPortfolioIds: Set<string>;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["globalSearch", query],
    queryFn: () => fetchSearchResults(query),
    enabled: query.trim().length > 0,
    staleTime: 30_000,
  });

  const adArtistIds = useMemo(
    () => new Set(data?.adArtistIds ?? []),
    [data?.adArtistIds],
  );

  const adPortfolioIds = useMemo(
    () => new Set(data?.adPortfolioIds ?? []),
    [data?.adPortfolioIds],
  );

  return {
    portfolios: data?.portfolios ?? [],
    artists: data?.artists ?? [],
    adArtistIds,
    adPortfolioIds,
    isLoading,
  };
}
