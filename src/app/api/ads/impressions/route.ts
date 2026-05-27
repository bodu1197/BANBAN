import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createStaticClient, createAdminClient } from "@/lib/supabase/server";
import { fetchBoostArtistIds } from "@/lib/supabase/boost-ranking";
import { UUID_RE } from "@/lib/validation";

const MAX_BATCH = 50;
const EMPTY = new NextResponse(null, { status: 204 });

interface ImpressionBody {
    portfolioIds: string[];
    placement: string;
    pagePath: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    let body: ImpressionBody;
    try {
        body = await request.json() as ImpressionBody;
    } catch {
        return EMPTY;
    }

    const { portfolioIds, placement, pagePath } = body;

    if (!Array.isArray(portfolioIds) || portfolioIds.length === 0) return EMPTY;

    const validIds = portfolioIds
        .filter((id): id is string => typeof id === "string" && UUID_RE.test(id))
        .slice(0, MAX_BATCH);
    if (validIds.length === 0) return EMPTY;

    const boostArtistIds = new Set(await fetchBoostArtistIds());
    if (boostArtistIds.size === 0) return EMPTY;

    const reader = createStaticClient();
    const { data: portfolios } = await reader
        .from("portfolios")
        .select("id, artist_id")
        .in("id", validIds);

    if (!portfolios || portfolios.length === 0) return EMPTY;

    const adPortfolios = portfolios.filter((p) => boostArtistIds.has(p.artist_id));
    if (adPortfolios.length === 0) return EMPTY;

    const adArtistIds = [...new Set(adPortfolios.map((p) => p.artist_id))];
    const now = new Date().toISOString();
    const { data: subs } = await reader
        .from("ad_subscriptions")
        .select("id, artist_id")
        .eq("status", "ACTIVE")
        .gt("expires_at", now)
        .in("artist_id", adArtistIds);

    if (!subs || subs.length === 0) return EMPTY;

    const artistToSub = new Map(subs.map((s) => [s.artist_id, s.id]));

    const safePlacement = String(placement ?? "unknown").slice(0, 50);
    const safePath = String(pagePath ?? "").split("?")[0].slice(0, 200) || null;

    const events = adPortfolios
        .filter((p) => artistToSub.has(p.artist_id))
        .map((p) => ({
            subscription_id: artistToSub.get(p.artist_id) ?? "",
            event_type: "IMPRESSION" as const,
            placement: safePlacement,
            page_path: safePath,
        }));

    if (events.length === 0) return EMPTY;

    const writer = createAdminClient();
    await writer.from("ad_events").insert(events);

    return EMPTY;
}
