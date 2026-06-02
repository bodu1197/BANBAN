import type { NextRequest } from "next/server";
import { createStaticClient, createAdminClient } from "./server";
import { fetchBoostArtistIds } from "./boost-ranking";
import { UUID_RE } from "@/lib/validation";

// 광고 노출(IMPRESSION)·클릭(CLICK) 단일 기록 경로.
// ad_events 가 통계 단일 진실 소스 — 카운터 컬럼은 더 이상 쓰지 않는다(getAdEventCounts 가 ad_events 집계).
// boost-ranking 을 import 하므로 ad-queries 와 분리(ad-queries→boost-ranking→ad-queries 순환 방지).

type AdEventType = "IMPRESSION" | "CLICK";

export interface ParsedAdEvent {
    validIds: string[];
    placement: string;
    pagePath: string;
}

/** body(unknown) 파싱 — portfolioIds UUID 검증/상한 + placement/pagePath 문자열 강제. 유효치 없으면 null. */
export async function parseAdEventBody(request: NextRequest, maxBatch: number): Promise<ParsedAdEvent | null> {
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
        .slice(0, maxBatch);
    if (validIds.length === 0) return null;

    return {
        validIds,
        placement: typeof placement === "string" ? placement : "unknown",
        pagePath: typeof pagePath === "string" ? pagePath : "",
    };
}

/**
 * 포폴 id 목록 중 실제 광고(부스트 대상)만 골라 활성 구독에 매핑해 ad_events 에 이벤트 insert.
 * 비광고 포폴 id 는 무시되므로 클라이언트가 광고 여부를 알 필요가 없다(서버가 판정).
 */
export async function recordAdPortfolioEvents(params: {
    portfolioIds: string[];
    eventType: AdEventType;
    placement: string;
    pagePath: string;
}): Promise<void> {
    if (params.portfolioIds.length === 0) return;

    const boostArtistIds = new Set(await fetchBoostArtistIds());
    if (boostArtistIds.size === 0) return;

    const reader = createStaticClient();
    const { data: portfolios } = await reader
        .from("portfolios")
        .select("id, artist_id")
        .in("id", params.portfolioIds);

    const adPortfolios = (portfolios ?? []).filter((p) => boostArtistIds.has(p.artist_id));
    if (adPortfolios.length === 0) return;

    const adArtistIds = [...new Set(adPortfolios.map((p) => p.artist_id))];
    const now = new Date().toISOString();
    // ad_subscriptions 는 anon SELECT RLS 가 없어 service_role 로 읽어야 함(anon 이면 0건 → 집계 누락)
    const admin = createAdminClient();
    const { data: subs } = await admin
        .from("ad_subscriptions")
        .select("id, artist_id")
        .eq("status", "ACTIVE")
        .gt("expires_at", now)
        .in("artist_id", adArtistIds);

    if (!subs || subs.length === 0) return;

    const artistToSub = new Map(subs.map((s) => [s.artist_id, s.id]));
    const safePlacement = params.placement.slice(0, 50);
    const safePath = params.pagePath.split("?")[0].slice(0, 200) || null;

    const events = adPortfolios
        .filter((p) => artistToSub.has(p.artist_id))
        .map((p) => ({
            subscription_id: artistToSub.get(p.artist_id) ?? "",
            event_type: params.eventType,
            placement: safePlacement,
            page_path: safePath,
        }));

    if (events.length === 0) return;
    await admin.from("ad_events").insert(events);
}
