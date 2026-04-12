import type { HomePortfolio } from "@/lib/supabase/home-queries";

export type PortfolioSortOption = "popular" | "price_asc" | "price_desc" | "newest" | "discount" | "random";

export type CategoryType = "GROUP" | "GENRE" | "SUBJECT" | "PART" | "SHOP" | "SKILL";

const CATEGORY_TYPES: ReadonlySet<CategoryType> = new Set([
  "GROUP", "GENRE", "SUBJECT", "PART", "SHOP", "SKILL",
]);

export function toCategoryType(value: string | null): CategoryType | null {
  if (value && CATEGORY_TYPES.has(value as CategoryType)) return value as CategoryType;
  return null;
}

export interface PortfolioSearchParams {
  typeArtist: "TATTOO" | "SEMI_PERMANENT";
  targetGender?: "MALE" | "FEMALE" | null;
  regionId?: string[] | string | null;
  regionSido?: string | null;
  categoryIds?: string[];
  searchWord?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  sort?: PortfolioSortOption;
  offset?: number;
  limit?: number;
}

export interface PortfolioSearchResult {
  portfolios: HomePortfolio[];
  totalCount: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  type: CategoryType;
  parentId?: string | null;
  targetGender?: string | null;
  artistType?: string | null;
}

export function getCategoryDisplayName(cat: CategoryItem): string {
  return cat.name;
}
