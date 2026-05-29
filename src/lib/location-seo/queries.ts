import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FaqItem } from "@/lib/pages/article-content";

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
  const supabase = await createClient();
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
  const supabase = await createClient();
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
