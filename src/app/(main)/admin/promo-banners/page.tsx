import { createAdminClient } from "@/lib/supabase/server";
import PromoBannersClient, { type PromoBanner } from "./PromoBannersClient";

export const dynamic = "force-dynamic";

export default async function PromoBannersPage(): Promise<React.ReactElement> {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from("promo_banners")
        .select("id, title, subtitle, image_path, link_url, order_index, is_active, created_at")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });

    const initialBanners = (data ?? []) as unknown as PromoBanner[];
    return <PromoBannersClient initialBanners={initialBanners} />;
}
