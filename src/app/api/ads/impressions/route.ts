import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createStaticClient, createAdminClient, type AdminSupabaseClient } from "@/lib/supabase/server";
import { fetchBoostArtistIds } from "@/lib/supabase/boost-ranking";
import { UUID_RE } from "@/lib/validation";

const MAX_BATCH = 50;
const EMPTY = new NextResponse(null, { status: 204 });

interface ParsedImpression {
    validIds: string[];
    placement: string;
    pagePath: string;
}

/** body(unknown) 파싱 + portfolioIds UUID 검증/상한 + placement/pagePath 문자열 강제. 유효치 없으면 null. */
async function parseImpression(request: NextRequest): Promise<ParsedImpression | null> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return null;
    }
    if (typeof body !== "object" || body === null) return null;

    const { portfolioIds, placement, pagePath } = body as Record<string, unknown>;
    if (!Array.isArray(portfolioIds) || portfolioIds.length === 0) return null;

    const validIds = portfolioIds
        .filter((id): id is string => typeof id === "string" && UUID_RE.test(id))
        .slice(0, MAX_BATCH);
    if (validIds.length === 0) return null;

    return {
        validIds,
        placement: typeof placement === "string" ? placement : "unknown",
        pagePath: typeof pagePath === "string" ? pagePath : "",
    };
}

/** 광고 포폴 ↔ 구독 매핑해 IMPRESSION 이벤트 insert (service_role). */
async function insertImpressions(
    admin: AdminSupabaseClient,
    adPortfolios: { artist_id: string }[],
    subs: { id: string; artist_id: string }[],
    placement: string,
    pagePath: string,
): Promise<void> {
    const artistToSub = new Map(subs.map((s) => [s.artist_id, s.id]));
    const safePlacement = placement.slice(0, 50);
    const safePath = pagePath.split("?")[0].slice(0, 200) || null;

    const events = adPortfolios
        .filter((p) => artistToSub.has(p.artist_id))
        .map((p) => ({
            subscription_id: artistToSub.get(p.artist_id) ?? "",
            event_type: "IMPRESSION" as const,
            placement: safePlacement,
            page_path: safePath,
        }));

    if (events.length === 0) return;
    await admin.from("ad_events").insert(events);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const parsed = await parseImpression(request);
    if (!parsed) return EMPTY;

    const boostArtistIds = new Set(await fetchBoostArtistIds());
    if (boostArtistIds.size === 0) return EMPTY;

    const reader = createStaticClient();
    const { data: portfolios } = await reader
        .from("portfolios")
        .select("id, artist_id")
        .in("id", parsed.validIds);

    const adPortfolios = (portfolios ?? []).filter((p) => boostArtistIds.has(p.artist_id));
    if (adPortfolios.length === 0) return EMPTY;

    const adArtistIds = [...new Set(adPortfolios.map((p) => p.artist_id))];
    const now = new Date().toISOString();
    // ad_subscriptions 는 anon SELECT RLS 가 없어 service_role 로 읽어야 함(anon 이면 0건 → 노출 집계 누락)
    const admin = createAdminClient();
    const { data: subs } = await admin
        .from("ad_subscriptions")
        .select("id, artist_id")
        .eq("status", "ACTIVE")
        .gt("expires_at", now)
        .in("artist_id", adArtistIds);

    if (!subs || subs.length === 0) return EMPTY;

    await insertImpressions(admin, adPortfolios, subs, parsed.placement, parsed.pagePath);
    return EMPTY;
}
