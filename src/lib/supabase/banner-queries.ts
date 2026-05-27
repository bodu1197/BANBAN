import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

export interface PromoBannerData {
  id: string;
  title: string;
  subtitle: string | null;
  image_path: string;
  link_url: string | null;
  is_active: boolean;
}

export interface QuickMenuItem {
  id: string;
  order_index: number;
  label: string;
  icon_path: string;
  link_url: string;
  is_active: boolean;
}

export const fetchQuickMenuItems = unstable_cache(
  async (): Promise<QuickMenuItem[]> => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from("quick_menu_items")
      .select("id, order_index, label, icon_path, link_url, is_active")
      .eq("is_active", true)
      .order("order_index", { ascending: true });
    if (error || !data) return [];
    return data as QuickMenuItem[];
  },
  ["quick-menu-items"],
  { revalidate: 300, tags: ["banners"] },
);

export const fetchPromoBanners = unstable_cache(
  async (): Promise<PromoBannerData[]> => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from("promo_banners")
      .select("id, title, subtitle, image_path, link_url, is_active")
      .eq("is_active", true)
      .order("order_index", { ascending: true });
    if (error || !data) return [];
    return data as PromoBannerData[];
  },
  ["promo-banners"],
  { revalidate: 300, tags: ["banners"] },
);
