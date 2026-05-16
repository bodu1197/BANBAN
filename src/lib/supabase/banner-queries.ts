import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export interface PromoBannerData {
  id: string;
  title: string;
  subtitle: string | null;
  image_path: string;
  link_url: string | null;
  is_active: boolean;
}

export interface HomeBannerData {
  slot: string;
  image_path: string;
  link_url: string;
  alt_text: string;
  is_active: boolean;
}

export async function fetchHomeBanners(): Promise<HomeBannerData[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from("home_banners")
    .select("slot, image_path, link_url, alt_text, is_active")
    .eq("is_active", true);

  if (error || !data) return [];

  return data as HomeBannerData[];
}

export interface QuickMenuItem {
  id: string;
  order_index: number;
  label: string;
  icon_path: string;
  link_url: string;
  is_active: boolean;
}

export async function fetchQuickMenuItems(): Promise<QuickMenuItem[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from("quick_menu_items")
    .select("id, order_index, label, icon_path, link_url, is_active")
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (error || !data) return [];

  return data as QuickMenuItem[];
}

export async function fetchPromoBanners(): Promise<PromoBannerData[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from("promo_banners")
    .select("id, title, subtitle, image_path, link_url, is_active")
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (error || !data) return [];

  return data as PromoBannerData[];
}
