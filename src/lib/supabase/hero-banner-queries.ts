import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getStorageUrl } from "./storage-utils";

export interface HeroBannerData {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
}

interface BannerRow {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_path: string;
  link_url: string | null;
  order_index: number;
}

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

async function fetchHeroBannersInternal(): Promise<HeroBannerData[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("banners")
    .select("id, title, subtitle, image_path, link_url, order_index, start_at, end_at")
    .eq("is_active", true)
    .or(`start_at.is.null,start_at.lte.${nowIso}`)
    .or(`end_at.is.null,end_at.gte.${nowIso}`)
    .order("order_index", { ascending: true });

  if (error || !data) return [];

  return (data as BannerRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    imageUrl: getStorageUrl(row.image_path) ?? "",
    linkUrl: row.link_url,
  }));
}

/** 활성 + 노출 기간 내 히어로 배너만 — order_index 정렬, ISR 60s */
export const fetchHeroBanners = unstable_cache(
  fetchHeroBannersInternal,
  ["home-hero-banners"],
  { revalidate: 60, tags: ["hero-banners"] },
);
