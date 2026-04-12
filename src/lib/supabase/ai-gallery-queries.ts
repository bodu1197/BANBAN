import { unstable_cache } from "next/cache";
import { getStorageUrl, getAvatarUrl } from "./storage-utils";
import { createClient } from "@supabase/supabase-js";

export interface SimilarityGalleryItem {
    id: string;
    portfolioId: string;
    storagePath: string;
    imageUrl: string | null;
    similarity: number;
    searchCount: number;
    title: string;
    price: number;
    priceOrigin: number;
    discountRate: number;
    artistName: string;
    artistRegion: string | null;
    artistProfileImage: string | null;
}

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
// Uses ANON_KEY (respects RLS) — similarity_top_results and portfolios tables must have SELECT policy for anon role
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

// Pool size to sample from on each cache regeneration. We over-fetch from the
// trending pool so the per-request shuffle (see fetchSimilarityGallery) has
// enough variety to make the home section feel alive instead of static.
const POOL_SIZE = 60;

async function fetchSimilarityGalleryInternal(): Promise<SimilarityGalleryItem[]> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data, error } = await supabase
        .from("similarity_top_results" as string)
        .select(`
            id, portfolio_id, storage_path, similarity, search_count
        `)
        .order("search_count", { ascending: false })
        .limit(POOL_SIZE);

    if (error) {
        throw new Error(`[Similarity Gallery] Fetch failed: ${error.message}`);
    }

    if (!data || data.length === 0) return [];

    // Enrich with portfolio data
    const portfolioIds = [...new Set((data as Record<string, unknown>[]).map((r) => r.portfolio_id as string))];
    const now = new Date().toISOString();
    const { data: portfolios } = await supabase
        .from("portfolios")
        .select("id, title, price, price_origin, discount_rate, artist:artists!inner(title, profile_image_path, portfolio_media_count, region:regions(name))")
        .in("id", portfolioIds)
        .is("deleted_at", null)
        .gt("price", 0)
        .gte("artists.portfolio_media_count", 5)
        .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`);

    const portfolioMap = new Map(
        (portfolios ?? []).map((p: Record<string, unknown>) => [p.id, p]),
    );

    return (data as Record<string, unknown>[]).map((row) =>
        mapRowToGalleryItem(row, portfolioMap),
    );
}

function str(val: unknown): string {
    return (val as string) ?? "";
}

function num(val: unknown): number {
    return (val as number) ?? 0;
}

type PortfolioInfo = Pick<SimilarityGalleryItem, "title" | "price" | "priceOrigin" | "discountRate" | "artistName" | "artistRegion" | "artistProfileImage">;

function extractPortfolioInfo(portfolio: Record<string, unknown> | undefined): PortfolioInfo {
    if (!portfolio) return { title: "", price: 0, priceOrigin: 0, discountRate: 0, artistName: "", artistRegion: null, artistProfileImage: null };
    const artist = portfolio.artist as Record<string, unknown> | null;
    const region = artist?.region as Record<string, string> | null;
    const profilePath = artist?.profile_image_path as string | null | undefined;
    return {
        title: str(portfolio.title),
        price: num(portfolio.price),
        priceOrigin: num(portfolio.price_origin),
        discountRate: num(portfolio.discount_rate),
        artistName: artist ? str(artist.title) : "",
        artistRegion: region?.name ?? null,
        artistProfileImage: profilePath ? getAvatarUrl(profilePath) : null,
    };
}

function mapRowToGalleryItem(
    row: Record<string, unknown>,
    portfolioMap: Map<unknown, unknown>,
): SimilarityGalleryItem {
    const info = extractPortfolioInfo(
        portfolioMap.get(row.portfolio_id) as Record<string, unknown> | undefined,
    );
    return {
        id: str(row.id),
        portfolioId: str(row.portfolio_id),
        storagePath: str(row.storage_path),
        imageUrl: getStorageUrl(str(row.storage_path)),
        similarity: num(row.similarity),
        searchCount: num(row.search_count),
        ...info,
    };
}

/**
 * Returns the trending pool (top-N by search_count). The home page is ISR-cached
 * for 1 hour, so shuffling on the server has no effect — every visitor would see
 * the same order until the next regeneration. Instead, we ship the full pool to
 * the client and let `<AiGallerySection>` shuffle on mount, so each visitor sees
 * a different random slice without invalidating the page cache.
 */
export async function fetchSimilarityGallery(): Promise<SimilarityGalleryItem[]> {
    return unstable_cache(
        () => fetchSimilarityGalleryInternal(),
        ["home-similarity-gallery"],
        { revalidate: 3600, tags: ["home", "similarity-gallery"] },
    )();
}
