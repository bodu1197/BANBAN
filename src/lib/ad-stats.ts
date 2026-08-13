/**
 * 관리자 광고 대시보드 집계 — 순수 함수(서버 의존성 없음)라 단위 테스트가 가능하다.
 * 돈이 걸린 계산이라 라우트 안에 두지 않고 분리했다.
 *
 * "활성" 기준은 만료일까지 보는 SSOT(lib/ad-status). status 컬럼만 보면 만료 크론이 돌기 전까지
 * 만료 구독의 결제액이 활성으로 잡혀 금액이 부풀려지고, 같은 화면의 배지와도 어긋난다.
 */
import { effectiveAdStatus, isAdStatus, AD_STATUS_ACTIVE, AD_STATUS_EXPIRED } from "@/lib/ad-status";

/** select 문자열과 타입을 한 곳에서 — 컬럼이 빠지면 집계가 조용히 틀어진다(artist_id 누락 → 광고주 1명) */
export const AD_STATS_COLUMNS = "status, expires_at, artist_id, paid_by_cash, paid_by_points, price_paid";

export interface AdStatsRow {
    status: string;
    expires_at: string | null;
    artist_id: string;
    paid_by_cash: number;
    paid_by_points: number;
    price_paid: number;
}

export interface AdminAdStats {
    totalRevenue: number;
    activeCount: number;
    /** 광고주 수 — 한 아티스트가 구독을 여러 개 가질 수 있어 activeCount 와 값이 다르다 */
    activeArtistCount: number;
    totalCount: number;
}

export interface AdPaymentBreakdown {
    totalCash: number;
    totalPoints: number;
    activeCash: number;
    activePoints: number;
}

/**
 * 행 → 집계 버킷.
 * 🔴 알 수 없는 status 는 매출에서 제외한다. effectiveAdStatus 는 "표시용" 으로 모르는 값을
 * EXPIRED(비노출)로 닫는데, 그 폴백을 금액 집계에 그대로 쓰면 오타 한 건이 매출로 잡힌다.
 * 결제 확정 = 집행 중(활성)이거나 끝난 것(만료). 대기·취소는 매출이 아니다.
 */
function classify(row: AdStatsRow, now: number): "active" | "paid" | "skip" {
    if (!isAdStatus(row.status)) return "skip";
    const status = effectiveAdStatus(row.status, row.expires_at, now);
    if (status === AD_STATUS_ACTIVE) return "active";
    return status === AD_STATUS_EXPIRED ? "paid" : "skip";
}

/**
 * 매출·결제·활성 집계를 구독 목록 한 벌·한 번의 순회로 계산 (예전엔 같은 행을 두 번 페치했다).
 * now 를 인자로 받는 이유: 행마다 Date.now() 를 부르면 목록 필터가 쓴 시각과 갈릴 수 있다.
 */
export function computeAdminAdStats(rows: AdStatsRow[], now: number = Date.now()): {
    stats: AdminAdStats;
    paymentBreakdown: AdPaymentBreakdown;
} {
    const stats: AdminAdStats = { totalRevenue: 0, activeCount: 0, activeArtistCount: 0, totalCount: 0 };
    const paymentBreakdown: AdPaymentBreakdown = { totalCash: 0, totalPoints: 0, activeCash: 0, activePoints: 0 };
    const activeArtists = new Set<string>();

    for (const row of rows) {
        const bucket = classify(row, now);
        if (bucket === "skip") continue;

        stats.totalCount += 1;
        stats.totalRevenue += row.price_paid || 0;
        paymentBreakdown.totalCash += row.paid_by_cash || 0;
        paymentBreakdown.totalPoints += row.paid_by_points || 0;

        if (bucket === "active") {
            stats.activeCount += 1;
            activeArtists.add(row.artist_id);
            paymentBreakdown.activeCash += row.paid_by_cash || 0;
            paymentBreakdown.activePoints += row.paid_by_points || 0;
        }
    }

    stats.activeArtistCount = activeArtists.size;
    return { stats, paymentBreakdown };
}
