import { NextResponse } from "next/server";
import { getActiveAdArtists } from "@/lib/supabase/ad-queries";

/** Public endpoint: returns currently active ad artists for rendering */
export async function GET(): Promise<NextResponse> {
    const activeAds = await getActiveAdArtists();
    return NextResponse.json({ activeAds });
}
