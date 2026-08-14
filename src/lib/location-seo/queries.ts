import "server-only";
import { createStaticClient } from "@/lib/supabase/server";
import type { FaqItem } from "@/lib/pages/article-content";

export interface LocationShopLink {
  id: string;
  title: string;
  address: string | null;
}

export interface LocationSeoPage {
  id: string;
  region_id: string;
  region_name: string;
  style: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
  cover_image_url: string | null;
  cover_image_alt: string | null;
  inline_images: { url: string; alt?: string }[];
  faq: FaqItem[];
  artist_count: number;
  portfolio_count: number;
  reading_time_minutes: number;
  published: boolean;
  published_at: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export async function fetchLocationSeoPageBySlug(
  slug: string,
): Promise<LocationSeoPage | null> {
  const decoded = decodeURIComponent(slug);
  // 쿠키 client(createClient)를 쓰면 이 페이지가 요청마다 동적으로 강등돼 revalidate 가 죽는다.
  // 지역 페이지는 로그인 여부와 무관한 공개 콘텐츠라 쿠키가 필요 없다.
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("location_seo_pages")
    .select("*")
    .eq("slug", decoded)
    .eq("published", true)
    .single();

  if (error) return null;
  // Supabase Json 타입(inline_images, faq) → 도메인 인터페이스 변환: 이중 cast 불가피(board/queries 동일 패턴).
  return data as unknown as LocationSeoPage;
}

/**
 * 지역 랜딩에서 그 지역 샵으로 나가는 실제 링크.
 *
 * 지역 페이지는 "반언니 등록 샵 3곳 / 작품 26개" 라고 숫자만 보여주고 그 샵으로 가는 <a> 가
 * 0개인 막다른 길이었다(2026-08-14 실측). 크롤러도 사용자도 여기서 더 갈 데가 없었다.
 * 쿠키를 안 읽는 static client 를 쓴다 — 쿠키 client 를 쓰면 페이지가 동적으로 강등돼 캐시가 죽는다.
 * 공개 조건은 목록/사이트맵과 동일(status=active · is_hide=false · deleted_at null).
 */
export async function fetchShopsInRegion(
  regionId: string,
  limit = 12,
): Promise<LocationShopLink[]> {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("artists")
    .select("id, title, address")
    .eq("region_id", regionId)
    .eq("status", "active")
    .eq("is_hide", false)
    .is("deleted_at", null)
    .order("likes_count", { ascending: false })
    .limit(limit);
  return (data ?? []) as LocationShopLink[];
}

export interface LocationSeoListItem {
  slug: string;
  title: string;
  region_name: string;
  style: string;
  excerpt: string;
  cover_image_url: string | null;
  artist_count: number;
  portfolio_count: number;
  published_at: string;
}

const LIST_FIELDS =
  "slug, title, region_name, style, excerpt, cover_image_url, artist_count, portfolio_count, published_at";

export async function fetchLocationSeoList(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ items: LocationSeoListItem[]; count: number }> {
  // 상동 — 공개 목록이므로 쿠키 없는 static client 를 써야 캐시가 산다.
  const supabase = createStaticClient();
  const limit = options?.limit ?? 60;
  const offset = options?.offset ?? 0;

  const { data, count, error } = await supabase
    .from("location_seo_pages")
    .select(LIST_FIELDS, { count: "exact" })
    .eq("published", true)
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { items: [], count: 0 };
  return { items: (data ?? []) as unknown as LocationSeoListItem[], count: count ?? 0 };
}
