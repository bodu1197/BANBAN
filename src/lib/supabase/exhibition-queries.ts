import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
// Uses ANON_KEY (respects RLS) — exhibitions table must have SELECT policy for anon role
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export interface ExhibitionItem {
    id: string;
    title: string;
    subtitle: string | null;
    image_path: string;
    link_url: string | null;
    category: string;
}

/**
 * Fetch active exhibitions for the public exhibition page.
 * Optionally filter by category.
 */
export async function fetchExhibitions(category?: string): Promise<ExhibitionItem[]> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const now = new Date().toISOString();

    let query = supabase
        .from("exhibitions")
        .select("id, title, subtitle, image_path, link_url, category")
        .eq("is_active", true)
        .or(`start_at.is.null,start_at.lte.${now}`)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .order("order_index", { ascending: true });

    if (category) query = query.eq("category", category);

    const { data, error } = await query;

    if (error || !data) return [];

    return (data as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        title: row.title as string,
        subtitle: (row.subtitle as string) ?? null,
        image_path: row.image_path as string,
        link_url: (row.link_url as string) ?? null,
        category: row.category as string,
    }));
}
