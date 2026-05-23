import { NextResponse } from "next/server";
import { getActiveAdArtists } from "@/lib/supabase/ad-queries";

/** Public endpoint: returns currently active ad artists for rendering. CDN 30s cache. */
export async function GET(): Promise<NextResponse> {
    const activeAds = await getActiveAdArtists();
    return NextResponse.json(
        { activeAds },
        { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
}
