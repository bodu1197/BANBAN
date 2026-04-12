// @client-reason: Custom hook for blog search state management with debounced input
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { BlogPost, BlogCategoryCount } from "@/lib/supabase/blog-queries";
import type { Region } from "@/types/database";
import { extractSido } from "@/lib/regions";
import type { TabValue } from "./BlogTypeTabs";

const PER_PAGE = 5000;

export interface BlogSearchState {
  tab: TabValue;
  categoryName: string | null;
  regionId: string | null;
  regionSido: string | null;
  searchWord: string;
  posts: BlogPost[];
  totalCount: number;
  categories: BlogCategoryCount[];
  regions: Region[];
  loading: boolean;
  hasMore: boolean;
}

export interface BlogSearchActions {
  setTab: (tab: TabValue) => void;
  setCategoryName: (name: string | null) => void;
  setRegions: (id: string | null, sido: string | null) => void;
  setSearchWord: (word: string) => void;
  loadMore: () => void;
}

interface InitialData {
  posts: BlogPost[];
  totalCount: number;
  categories: BlogCategoryCount[];
  regions: Region[];
}

function tabToParams(tab: TabValue): { typeArtist: string | null; targetGender: string | null } {
  if (tab === "TATTOO") return { typeArtist: "TATTOO", targetGender: null };
  if (tab === "MALE_SEMI") return { typeArtist: "SEMI_PERMANENT", targetGender: "MALE" };
  if (tab === "FEMALE_SEMI") return { typeArtist: "SEMI_PERMANENT", targetGender: "FEMALE" };
  return { typeArtist: null, targetGender: null };
}

function buildUrl(params: Record<string, string | null | number>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "") sp.set(k, String(v));
  }
  return `/api/blog/search?${sp.toString()}`;
}

async function fetchFromApi(
  tab: TabValue, cat: string | null, region: string | null, search: string, offset: number, withCategories: boolean,
): Promise<{ data: BlogPost[]; count: number; categories?: BlogCategoryCount[] }> {
  const { typeArtist, targetGender } = tabToParams(tab);
  const params: Record<string, string | null | number> = {
    typeArtist, targetGender, categoryName: cat, regionId: region,
    searchWord: search || null, limit: PER_PAGE, offset,
  };
  if (withCategories) params._categories = 1;
  const res = await fetch(buildUrl(params));
  return res.json();
}

function useDebouncedFetch(
  searchWord: string, fetchFn: () => void,
): void {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitial = useRef(true);

  useEffect(() => {
    if (isInitial.current) { isInitial.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchFn, 300);
    return (): void => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchWord, fetchFn]);
}

export function useBlogSearch(initial: InitialData): BlogSearchState & BlogSearchActions {
  const [tab, setTabState] = useState<TabValue>("FEMALE_SEMI");
  const [categoryName, setCatState] = useState<string | null>(null);
  const [regionId, setRegState] = useState<string | null>(null);
  const [regionSido, setRegSidoState] = useState<string | null>(null);
  const [searchWord, setSearchState] = useState("");
  const [posts, setPosts] = useState(initial.posts);
  const [totalCount, setTotalCount] = useState(initial.totalCount);
  const [categories, setCategories] = useState(initial.categories);
  const [loading, setLoading] = useState(false);

  const fetchPosts = useCallback(async (
    t: TabValue, c: string | null, r: string | null, s: string, offset: number, append: boolean, cats: boolean,
  ): Promise<void> => {
    setLoading(true);
    try {
      const json = await fetchFromApi(t, c, r, s, offset, cats);
      setPosts((prev) => (append ? [...prev, ...json.data] : json.data));
      setTotalCount(json.count);
      if (json.categories) setCategories(json.categories);
    } catch { /* keep existing state */ } finally { setLoading(false); }
  }, []);

  const setTab = useCallback((t: TabValue): void => {
    setTabState(t); setCatState(null);
    fetchPosts(t, null, regionId, searchWord, 0, false, true);
  }, [regionId, searchWord, fetchPosts]);

  const setCategoryName = useCallback((n: string | null): void => {
    setCatState(n); fetchPosts(tab, n, regionId, searchWord, 0, false, false);
  }, [tab, regionId, searchWord, fetchPosts]);

  const setRegions = useCallback((id: string | null, sido: string | null): void => {
    // When sido is selected without specific region IDs, resolve all region IDs for that sido
    const resolvedId = id ?? (sido ? initial.regions.filter((r) => extractSido(r.name) === sido).map((r) => r.id).join(",") || null : null);
    setRegState(resolvedId); setRegSidoState(sido);
    fetchPosts(tab, categoryName, resolvedId, searchWord, 0, false, false);
  }, [tab, categoryName, searchWord, fetchPosts, initial.regions]);

  const debounceFn = useCallback((): void => {
    fetchPosts(tab, categoryName, regionId, searchWord, 0, false, false);
  }, [tab, categoryName, regionId, searchWord, fetchPosts]);
  useDebouncedFetch(searchWord, debounceFn);

  const loadMore = useCallback((): void => {
    fetchPosts(tab, categoryName, regionId, searchWord, posts.length, true, false);
  }, [tab, categoryName, regionId, searchWord, posts.length, fetchPosts]);

  return {
    tab, categoryName, regionId, regionSido, searchWord, posts, totalCount, categories,
    regions: initial.regions, loading, hasMore: posts.length < totalCount,
    setTab, setCategoryName, setRegions, setSearchWord: setSearchState, loadMore,
  };
}
