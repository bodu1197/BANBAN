// @client-reason: React Query hook for search fetching
"use client";

import { useQuery } from "@tanstack/react-query";
import type { HomePortfolio } from "@/lib/supabase/portfolio-common";

interface ArtistResult {
  id: string;
  name: string;
  profileImage: string | null;
  region: string | null;
  portfolioCount: number;
}

interface SearchData {
  portfolios: HomePortfolio[];
  artists: ArtistResult[];
}

async function fetchSearchResults(query: string): Promise<SearchData> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  return res.json() as Promise<SearchData>;
}

export function useSearchFetch(query: string): {
  portfolios: HomePortfolio[];
  artists: ArtistResult[];
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["globalSearch", query],
    queryFn: () => fetchSearchResults(query),
    enabled: query.trim().length > 0,
    staleTime: 30_000,
  });

  return {
    portfolios: data?.portfolios ?? [],
    artists: data?.artists ?? [],
    isLoading,
  };
}
