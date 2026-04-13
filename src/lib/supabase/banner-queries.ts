import { createClient } from "@supabase/supabase-js";
import type { HeroBannerData } from "@/components/home/ExhibitionBanner";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
// Uses ANON_KEY (respects RLS) — banners table must have SELECT policy for anon role
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export interface PromoBannerData {
  id: string;
  title: string;
  subtitle: string | null;
  image_path: string;
  link_url: string | null;
  is_active: boolean;
}

/**
 * Fetch all active promo banners ordered by order_index.
 */
export async function fetchPromoBanners(): Promise<PromoBannerData[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from("promo_banners" as "banners")
    .select("id, title, subtitle, image_path, link_url, is_active")
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (error || !data) return [];

  return data as unknown as PromoBannerData[];
}

/**
 * Fetch all active banners (by order_index) within their scheduled window.
 * Returns empty array if no active banners exist — the component falls back to a static design.
 */
export async function fetchActiveBanners(): Promise<HeroBannerData[]> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from("banners")
        .select("id, title, subtitle, image_path, link_url")
        .eq("is_active", true)
        .or(`start_at.is.null,start_at.lte.${now}`)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .order("order_index", { ascending: true });

    if (error || !data) return [];

    return (data as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        title: row.title as string,
        subtitle: (row.subtitle as string) ?? null,
        image_path: row.image_path as string,
        link_url: (row.link_url as string) ?? null,
    }));
}
