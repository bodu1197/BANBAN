// @client-reason: Custom hook using useRouter, useSearchParams for URL-synced filter state
"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PortfolioSortOption } from "@/types/portfolio-search";

export interface PortfolioFilters {
  regionId: string | null;
  regionSido: string | null;
  categoryIds: string[];
  searchWord: string;
  sort: PortfolioSortOption;
  priceMax: number;
}

interface UsePortfolioFiltersReturn {
  filters: PortfolioFilters;
  setRegions: (id: string | null, sido: string | null) => void;
  setCategoryIds: (ids: string[]) => void;
  setSearchWord: (word: string) => void;
  setSort: (sort: PortfolioSortOption) => void;
  setPriceMax: (price: number) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

function parseFilters(sp: URLSearchParams, fallbackCategoryIds?: string[]): PortfolioFilters {
  const catRaw = sp.get("categoryIds");
  const categoryIds = catRaw ? catRaw.split(",").filter(Boolean) : (fallbackCategoryIds ?? []);
  return {
    regionId: sp.get("regionId") || null,
    regionSido: sp.get("regionSido") || null,
    categoryIds,
    searchWord: sp.get("q") ?? "",
    sort: (sp.get("sort") as PortfolioSortOption) || "random",
    priceMax: Number(sp.get("priceMax") ?? "0"),
  };
}

function checkActiveFilters(f: PortfolioFilters, initialCategoryIds?: string[]): boolean {
  const areCategoriesCustom = f.categoryIds.join(',') !== (initialCategoryIds ?? []).join(',');
  return Boolean(f.regionId || f.regionSido || areCategoriesCustom || f.searchWord || f.sort !== "random" || f.priceMax > 0);
}

export function usePortfolioFilters(initialCategoryIds?: string[]): UsePortfolioFiltersReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<PortfolioFilters>(
    () => parseFilters(searchParams, initialCategoryIds),
    [searchParams, initialCategoryIds],
  );

  const hasActiveFilters = useMemo(() => checkActiveFilters(filters, initialCategoryIds), [filters, initialCategoryIds]);

  const updateParams = useCallback(
    (updates: Partial<Record<string, string | null>>): void => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const setRegions = useCallback(
    (id: string | null, sido: string | null): void => updateParams({ regionId: id, regionSido: sido }),
    [updateParams],
  );

  const setCategoryIds = useCallback(
    (ids: string[]): void => updateParams({ categoryIds: ids.length > 0 ? ids.join(",") : null }),
    [updateParams],
  );

  const setSearchWord = useCallback(
    (word: string): void => updateParams({ q: word || null }),
    [updateParams],
  );

  const setSort = useCallback(
    (sort: PortfolioSortOption): void => updateParams({ sort: sort === "random" ? null : sort }),
    [updateParams],
  );

  const setPriceMax = useCallback(
    (price: number): void => updateParams({ priceMax: price > 0 ? String(price) : null }),
    [updateParams],
  );

  const resetFilters = useCallback((): void => {
    router.push(pathname);
  }, [pathname, router]);

  return { filters, setRegions, setCategoryIds, setSearchWord, setSort, setPriceMax, resetFilters, hasActiveFilters };
}
