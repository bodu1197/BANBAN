import { createClient, createAdminClient } from "./server";
import type { Region } from "@/types/database";

export interface BlogPost {
  id: string;
  portfolio_id: string;
  slug: string;
  title: string;
  content: string;
  meta_description: string | null;
  tags: string[];
  image_url: string | null;
  artist_name: string | null;
  artist_id: string | null;
  category_name: string | null;
  created_at: string;
  published: boolean;
}

export interface BlogSearchParams {
  typeArtist?: "SEMI_PERMANENT" | null;
  targetGender?: "MALE" | "FEMALE" | null;
  categoryName?: string | null;
  regionId?: string | null;
  searchWord?: string | null;
  limit?: number;
  offset?: number;
}

export interface BlogCategoryCount {
  category_name: string;
  count: number;
}

export interface BlogRegion {
  id: string;
  name: string;
}

const FEMALE_SEMI_CATEGORIES = [
  "입술", "아이라인", "속눈썹", "두피", "헤어라인", "얼굴", "그라데이션 기법",
];

function isMaleCategory(name: string): boolean {
  return name.includes("남자");
}

function isFemaleCategory(name: string): boolean {
  if (name.includes("여자")) return true;
  return FEMALE_SEMI_CATEGORIES.some((c) => name.includes(c));
}

export async function fetchBlogPosts(options: {
  limit?: number;
  offset?: number;
}): Promise<{ data: BlogPost[]; count: number }> {
  return searchBlogPosts({ limit: options.limit, offset: options.offset });
}

function buildRpcParams(params: BlogSearchParams): Record<string, unknown> {
  return {
    p_type_artist: params.typeArtist ?? null,
    p_target_gender: params.targetGender ?? null,
    p_category_name: params.categoryName ?? null,
    p_region_id: params.regionId ?? null,
    p_search_word: params.searchWord ?? null,
    p_limit: params.limit ?? 20,
    p_offset: params.offset ?? 0,
  };
}

export async function searchBlogPosts(
  params: BlogSearchParams,
): Promise<{ data: BlogPost[]; count: number }> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types yet
  const { data, error } = await (supabase as any).rpc("search_blog_posts", buildRpcParams(params));

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to search blog posts: ${error.message}`);
    return { data: [], count: 0 };
  }

  const rows = (data ?? []) as (BlogPost & { total_count: number })[];
  return {
    data: rows.map(({ total_count: _, ...rest }) => rest as unknown as BlogPost),
    count: rows[0]?.total_count ?? 0,
  };
}

function filterCategoriesByGender(
  rows: BlogCategoryCount[],
  targetGender: "MALE" | "FEMALE" | null | undefined,
): BlogCategoryCount[] {
  if (!targetGender) return rows;
  return rows.filter((r) =>
    targetGender === "MALE" ? isMaleCategory(r.category_name) : isFemaleCategory(r.category_name),
  );
}

export async function fetchBlogCategories(
  typeArtist?: "SEMI_PERMANENT" | null,
  targetGender?: "MALE" | "FEMALE" | null,
): Promise<BlogCategoryCount[]> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types yet
  const { data, error } = await (supabase as any).rpc("get_blog_category_counts", {
    p_type_artist: typeArtist ?? null,
    p_target_gender: targetGender ?? null,
  });

  if (error || !data) return [];

  const rows = data as { category_name: string; count: number }[];
  return filterCategoriesByGender(rows, targetGender);
}

export async function fetchBlogRegions(): Promise<Region[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .order("order_index", { ascending: true });

  if (error || !data) return [];
  return data as Region[];
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const decoded = decodeURIComponent(slug);
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated types yet
  const { data, error } = await (supabase as any)
    .from("blog_posts")
    .select("*")
    .eq("slug", decoded)
    .eq("published", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch blog post: ${error.message}`);
    return null;
  }

  return data as unknown as BlogPost;
}

export async function fetchBlogSlugs(): Promise<string[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated types yet
  const { data, error } = await (supabase as any)
    .from("blog_posts")
    .select("slug")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch blog slugs: ${error.message}`);
    return [];
  }

  return (data ?? []).map((r: { slug: string }) => r.slug);
}

export async function fetchArtistProfileImage(artistId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("artists")
    .select("profile_image_path")
    .eq("id", artistId)
    .single();

  if (error) return null;

  const path = (data as { profile_image_path: string | null })?.profile_image_path;
  if (!path) return null;

  const bucketUrl = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()}/storage/v1/object/public/avatars`;
  return `${bucketUrl}/${path}`;
}

export async function fetchArtistProfileImages(artistIds: string[]): Promise<Map<string, string>> {
  if (artistIds.length === 0) return new Map();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("artists")
    .select("id, profile_image_path")
    .in("id", artistIds);

  if (error) return new Map();

  const bucketUrl = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()}/storage/v1/object/public/avatars`;
  const map = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; profile_image_path: string | null }[]) {
    if (row.profile_image_path) {
      map.set(row.id, `${bucketUrl}/${row.profile_image_path}`);
    }
  }
  return map;
}
