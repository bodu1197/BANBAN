// @client-reason: Custom hook for artist insight search state management
"use client";

import { useState, useCallback } from "react";
import type { ArtistInsight } from "@/lib/supabase/artist-insight-queries";
import type { Region } from "@/types/database";
import { extractSido } from "@/lib/regions";
import type { InsightTabValue } from "./InsightTypeTabs";

const PER_PAGE = 20;

export interface InsightSearchState {
  tab: InsightTabValue;
  regionId: string | null;
  regionSido: string | null;
  insights: ArtistInsight[];
  totalCount: number;
  regions: Region[];
  loading: boolean;
  hasMore: boolean;
}

export interface InsightSearchActions {
  setTab: (tab: InsightTabValue) => void;
  setRegions: (id: string | null, sido: string | null) => void;
  loadMore: () => void;
}

interface InitialData {
  insights: ArtistInsight[];
  totalCount: number;
  regions: Region[];
}

function buildUrl(params: Record<string, string | null | number>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "") sp.set(k, String(v));
  }
  return `/api/artist-insight/search?${sp.toString()}`;
}

async function fetchFromApi(
  tab: InsightTabValue, region: string | null, offset: number,
): Promise<{ data: ArtistInsight[]; count: number }> {
  const typeArtist = tab === "ALL" ? null : tab;
  const params: Record<string, string | null | number> = {
    typeArtist, regionId: region, limit: PER_PAGE, offset,
  };
  const res = await fetch(buildUrl(params));
  return res.json();
}

export function useInsightSearch(initial: InitialData): InsightSearchState & InsightSearchActions {
  const [tab, setTabState] = useState<InsightTabValue>("ALL");
  const [regionId, setRegState] = useState<string | null>(null);
  const [regionSido, setRegSidoState] = useState<string | null>(null);
  const [insights, setInsights] = useState(initial.insights);
  const [totalCount, setTotalCount] = useState(initial.totalCount);
  const [loading, setLoading] = useState(false);

  const fetchInsights = useCallback(async (
    t: InsightTabValue, r: string | null, offset: number, append: boolean,
  ): Promise<void> => {
    setLoading(true);
    try {
      const json = await fetchFromApi(t, r, offset);
      setInsights((prev) => (append ? [...prev, ...json.data] : json.data));
      setTotalCount(json.count);
    } catch { /* keep existing state */ } finally { setLoading(false); }
  }, []);

  const setTab = useCallback((t: InsightTabValue): void => {
    setTabState(t);
    fetchInsights(t, regionId, 0, false);
  }, [regionId, fetchInsights]);

  const setRegions = useCallback((id: string | null, sido: string | null): void => {
    const resolvedId = id ?? (sido ? initial.regions.filter((r) => extractSido(r.name) === sido).map((r) => r.id).join(",") || null : null);
    setRegState(resolvedId); setRegSidoState(sido);
    fetchInsights(tab, resolvedId, 0, false);
  }, [tab, fetchInsights, initial.regions]);

  const loadMore = useCallback((): void => {
    fetchInsights(tab, regionId, insights.length, true);
  }, [tab, regionId, insights.length, fetchInsights]);

  return {
    tab, regionId, regionSido, insights, totalCount,
    regions: initial.regions, loading, hasMore: insights.length < totalCount,
    setTab, setRegions, loadMore,
  };
}
