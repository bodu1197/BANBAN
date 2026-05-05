import { createClient, createAdminClient } from "./server";

export interface ArtistInsight {
  id: string;
  artist_id: string;
  slug: string;
  title: string;
  content: string;
  meta_description: string | null;
  summary: string | null;
  tags: string[];
  cover_image_url: string | null;
  artist_name: string | null;
  portfolio_count: number;
  review_count: number;
  avg_rating: number;
  specialties: string[];
  published: boolean;
  created_at: string;
}

export async function fetchArtistInsights(options: {
  limit?: number;
  offset?: number;
  typeArtist?: string;
}): Promise<{ data: ArtistInsight[]; count: number }> {
  const { limit = 20, offset = 0, typeArtist } = options;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- artist_insights not in generated types yet
  let query = (supabase as any)
    .from("artist_insights")
    .select("*", { count: "exact" })
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (typeArtist) {
    query = query.eq("type_artist", typeArtist);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch artist insights: ${error.message}`);
    return { data: [], count: 0 };
  }

  return {
    data: (data ?? []) as unknown as ArtistInsight[],
    count: count ?? 0,
  };
}

export interface ArtistInsightSearchParams {
  typeArtist?: "TATTOO" | "SEMI_PERMANENT" | null;
  regionId?: string | null;
  limit?: number;
  offset?: number;
}

export async function searchArtistInsights(
  params: ArtistInsightSearchParams,
): Promise<{ data: ArtistInsight[]; count: number }> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types yet
  const { data, error } = await (supabase as any).rpc("search_artist_insights", {
    p_type_artist: params.typeArtist ?? null,
    p_region_id: params.regionId ?? null,
    p_limit: params.limit ?? 20,
    p_offset: params.offset ?? 0,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to search artist insights: ${error.message}`);
    return { data: [], count: 0 };
  }

  const rows = (data ?? []) as (ArtistInsight & { total_count: number })[];
  return {
    data: rows.map(({ total_count: _, ...rest }) => rest as unknown as ArtistInsight),
    count: rows[0]?.total_count ?? 0,
  };
}

export async function fetchArtistInsightBySlug(slug: string): Promise<ArtistInsight | null> {
  const decoded = decodeURIComponent(slug);
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- artist_insights not in generated types yet
  const { data, error } = await (supabase as any)
    .from("artist_insights")
    .select("*")
    .eq("slug", decoded)
    .eq("published", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch artist insight: ${error.message}`);
    return null;
  }

  return data as unknown as ArtistInsight;
}

export async function fetchArtistInsightSlugs(): Promise<string[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- artist_insights not in generated types yet
  const { data, error } = await (supabase as any)
    .from("artist_insights")
    .select("slug")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch insight slugs: ${error.message}`);
    return [];
  }

  return (data ?? []).map((r: { slug: string }) => r.slug);
}
