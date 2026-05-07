import { createStaticClient } from "./server";
import { toCategoryType } from "@/types/portfolio-search";
import type { PortfolioSearchParams, PortfolioSearchResult, CategoryItem } from "@/types/portfolio-search";
import type { Region } from "@/types/database";
import { type PortfolioRowWithType, mapPortfolioRow } from "./portfolio-common";
import { secureShuffle } from "@/lib/random";

function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySortOrder(query: any, sort: string): any {
  switch (sort) {
    case "price_asc":
      return query.order("price", { ascending: true });
    case "price_desc":
      return query.order("price", { ascending: false });
    case "newest":
      return query.order("created_at", { ascending: false });
    case "discount":
      return query.order("discount_rate", { ascending: false });
    case "random":
      // For random, we fetch by likes_count then shuffle client-side
      return query.order("likes_count", { ascending: false });
    default:
      return query.order("likes_count", { ascending: false });
  }
}

const shuffleArray = secureShuffle;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyPriceFilters(query: any, priceMin?: number | null, priceMax?: number | null): any {
  if (priceMin !== null && priceMin !== undefined) query = query.gte("price", priceMin);
  if (priceMax !== null && priceMax !== undefined) query = query.lte("price", priceMax);
  return query;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveRegionIds(supabase: any, regionSido: string | null | undefined, regionId: string[] | string | null | undefined): Promise<string[] | null> {
  if (regionSido) {
    const { data: rData } = await supabase.from("regions").select("id").like("name", `${escapeIlike(regionSido)}%`);
    return rData && rData.length > 0 ? rData.map((r: { id: string }) => r.id) : [];
  }
  if (regionId) return Array.isArray(regionId) ? regionId : [regionId];
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveKeywordCategories(supabase: any, searchWord: string | null | undefined, categoryIds: string[] | undefined): Promise<string[]> {
  const effective = categoryIds ? [...categoryIds] : [];
  if (!searchWord) return effective;

  const { data: keywordCatData } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", `%${escapeIlike(searchWord)}%`);

  if (keywordCatData && keywordCatData.length > 0) {
    const matchedCatIds = keywordCatData.map((c: { id: string }) => c.id);
    return [...new Set([...effective, ...matchedCatIds])];
  }
  // searchWord given but no matching category → force empty result by returning
  // a dummy never-matching sentinel (empty array signals "no category filter")
  // We signal "no results" by returning a special value that resolveOrCondition can detect.
  // Use a non-existent UUID to ensure zero matches from categorizables.
  return [...effective, "00000000-0000-0000-0000-000000000000"];
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function expandWithChildCategories(supabase: any, categoryIds: string[]): Promise<string[]> {
  if (categoryIds.length === 0) return categoryIds;
  const { data: children } = await supabase.from("categories").select("id").in("parent_id", categoryIds);
  if (children && children.length > 0) {
    return [...new Set([...categoryIds, ...children.map((c: { id: string }) => c.id)])];
  }
  return categoryIds;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveGenderCategoryIds(supabase: any, targetGender: "MALE" | "FEMALE"): Promise<string[]> {
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("target_gender", targetGender)
    .eq("artist_type", "SEMI_PERMANENT");
  return (data ?? []).map((c: { id: string }) => c.id);
}

export async function searchPortfolios(
  params: PortfolioSearchParams,
): Promise<PortfolioSearchResult> {
  const supabase = createStaticClient();
  const { typeArtist, targetGender, categoryIds, regionId, regionSido, searchWord, priceMin, priceMax, sort = "random", offset = 0, limit = 24 } = params;

  // 1. Resolve region IDs
  const effectiveRegionIds = await resolveRegionIds(supabase, regionSido, regionId);
  if (effectiveRegionIds !== null && effectiveRegionIds.length === 0) return { portfolios: [], totalCount: 0 };

  // 2. Resolve keyword categories (chip clicks or text search → category name match)
  let effectiveCategoryIds = await resolveKeywordCategories(supabase, searchWord, categoryIds);

  // 2b. Include child categories (e.g. selecting 속눈썹 also includes 펌)
  effectiveCategoryIds = await expandWithChildCategories(supabase, effectiveCategoryIds);

  // 3. Gender filter: when targetGender is set and no category selected,
  // auto-resolve all matching gender categories to filter portfolios
  if (targetGender && effectiveCategoryIds.length === 0) {
    effectiveCategoryIds = await resolveGenderCategoryIds(supabase, targetGender);
    if (effectiveCategoryIds.length === 0) return { portfolios: [], totalCount: 0 };
  }

  // 4. Execute query with RPC JOIN-based filtering if categories exist
  return executePortfolioQuery({
    supabase,
    typeArtist,
    regionIds: effectiveRegionIds,
    categoryIds: effectiveCategoryIds,
    priceMin,
    priceMax,
    sort,
    offset,
    limit,
  });
}

interface ExecutePortfolioQueryOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  typeArtist: string;
  regionIds: string[] | null;
  categoryIds: string[];
  priceMin: number | null | undefined;
  priceMax: number | null | undefined;
  sort: string;
  offset: number;
  limit: number;
}

const SELECT_JOINED = `
  id, artist_id, title, price_origin, price, discount_rate, sale_ended_at, likes_count,
  portfolio_media(storage_path, order_index),
  artist:artists!inner(title, address, profile_image_path, type_artist, is_hide, deleted_at, region:regions(name))
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyBaseArtistFilters(query: any, typeArtist: string, regionIds: string[] | null): any {
  const now = new Date().toISOString();
  let q = query
    .is("deleted_at", null)
    .gt("price", 0)
    .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`)
    .eq("artists.type_artist", typeArtist)
    .is("artists.deleted_at", null)
    .eq("artists.is_hide", false)
    .eq("artists.status", "active")
    .gte("artists.portfolio_media_count", 5);

  if (regionIds && regionIds.length > 0) q = q.in("artists.region_id", regionIds);
  return q;
}


function buildCategoryRpcParams(categoryIds: string[], typeArtist: string, regionIds: string[] | null): Record<string, unknown> {
  const params: Record<string, unknown> = { p_category_ids: categoryIds };
  if (typeArtist && typeArtist !== "ALL") params.p_type_artist = typeArtist;
  if (regionIds && regionIds.length > 0) params.p_region_ids = regionIds;
  return params;
}

async function executePortfolioQuery(
  opts: ExecutePortfolioQueryOptions,
): Promise<PortfolioSearchResult> {
  const { supabase, typeArtist, regionIds, categoryIds, priceMin, priceMax, sort, offset, limit } = opts;
  const isCategorySearch = categoryIds.length > 0;
  let countQuery;
  let dataQuery;

  const nowISO = new Date().toISOString();

  if (isCategorySearch) {
    const rpcParams = buildCategoryRpcParams(categoryIds, typeArtist, regionIds);
    countQuery = supabase.rpc("search_portfolios_by_category_ids", rpcParams, { count: "exact", head: true })
      .gt("price", 0)
      .or(`sale_ended_at.is.null,sale_ended_at.gte.${nowISO}`);
    dataQuery = supabase.rpc("search_portfolios_by_category_ids", rpcParams).select(SELECT_JOINED)
      .gt("price", 0)
      .or(`sale_ended_at.is.null,sale_ended_at.gte.${nowISO}`);
  } else {
    countQuery = applyBaseArtistFilters(supabase.from("portfolios").select("id", { count: "exact", head: true }), typeArtist, regionIds);
    dataQuery = applyBaseArtistFilters(supabase.from("portfolios").select(SELECT_JOINED), typeArtist, regionIds);
  }

  const isRandom = sort === "random";
  const fetchLimit = isRandom ? limit * 3 : limit;

  countQuery = applyPriceFilters(countQuery, priceMin, priceMax);
  dataQuery = applyPriceFilters(dataQuery, priceMin, priceMax);
  dataQuery = applySortOrder(dataQuery, sort);
  dataQuery = dataQuery.range(offset, offset + fetchLimit - 1);

  const [{ count }, { data }] = await Promise.all([countQuery, dataQuery]);
  let portfolios = ((data ?? []) as PortfolioRowWithType[]).map(mapPortfolioRow);

  if (isRandom) {
    portfolios = shuffleArray(portfolios).slice(0, limit);
  }

  return {
    portfolios,
    totalCount: count ?? 0,
  };
}



function matchesGenderFilter(catGender: string | null, targetGender: "MALE" | "FEMALE" | null | undefined): boolean {
  if (!targetGender || !catGender) return true;
  return catGender === targetGender;
}

export async function fetchCategoriesByType(
  typeArtist: "SEMI_PERMANENT",
  targetGender?: "MALE" | "FEMALE" | null,
): Promise<CategoryItem[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, category_type, order_index, parent_id, target_gender, artist_type")
    .eq("artist_type", typeArtist)
    .order("order_index", { ascending: true });

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch categories: ${error.message}`);
    return [];
  }

  return (data ?? [])
    .filter((c: { target_gender: string | null }) =>
      matchesGenderFilter(c.target_gender, targetGender),
    )
    .map((c: { id: string; name: string; category_type: string | null; parent_id: string | null; target_gender: string | null; artist_type: string | null }) => ({
      id: c.id,
      name: c.name,
      type: toCategoryType(c.category_type) ?? "GENRE",
      parentId: c.parent_id ?? null,
      targetGender: c.target_gender ?? null,
      artistType: c.artist_type ?? null,
    }));
}

export async function fetchActiveRegions(
  typeArtist: "SEMI_PERMANENT",
): Promise<Region[]> {
  const supabase = createStaticClient();

  const { data: artistData } = await supabase
    .from("artists")
    .select("region_id")
    .is("deleted_at", null)
    .eq("is_hide", false)
    .eq("status", "active")
    .gte("portfolio_media_count", 5)
    .eq("type_artist", typeArtist);

  const activeRegionIds = [
    ...new Set(
      (artistData ?? [])
        .map((a: { region_id: string | null }) => a.region_id)
        .filter((id): id is string => id !== null),
    ),
  ];

  if (activeRegionIds.length === 0) return [];

  const { data } = await supabase
    .from("regions")
    .select("*")
    .in("id", activeRegionIds)
    .order("order_index", { ascending: true });

  return (data ?? []) as Region[];
}
