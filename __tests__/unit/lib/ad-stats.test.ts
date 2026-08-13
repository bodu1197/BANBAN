import { describe, it, expect } from "vitest";
import { computeAdminAdStats, type AdStatsRow } from "@/lib/ad-stats";

const FUTURE = "2999-01-01T00:00:00.000Z";
const PAST = "2000-01-01T00:00:00.000Z";

function row(over: Partial<AdStatsRow>): AdStatsRow {
    return {
        status: "ACTIVE", expires_at: FUTURE, artist_id: "a1",
        paid_by_cash: 0, paid_by_points: 0, price_paid: 0, ...over,
    };
}

describe("computeAdminAdStats", () => {
    it("만료된 구독의 결제액은 '활성' 금액에서 빠진다 (status 컬럼만 보면 부풀려지던 값)", () => {
        const { stats, paymentBreakdown } = computeAdminAdStats([
            row({ status: "ACTIVE", expires_at: FUTURE, price_paid: 100, paid_by_cash: 100 }),
            row({ status: "ACTIVE", expires_at: PAST, price_paid: 50, paid_by_cash: 50 }),
        ]);
        expect(stats.totalRevenue).toBe(150);
        expect(stats.activeCount).toBe(1);
        expect(paymentBreakdown.totalCash).toBe(150);
        expect(paymentBreakdown.activeCash).toBe(100);
    });

    it("대기·취소는 매출에 넣지 않는다", () => {
        const { stats } = computeAdminAdStats([
            row({ status: "PENDING", expires_at: null, price_paid: 999 }),
            row({ status: "CANCELLED", expires_at: FUTURE, price_paid: 999 }),
            row({ status: "EXPIRED", expires_at: PAST, price_paid: 10 }),
        ]);
        expect(stats.totalRevenue).toBe(10);
        expect(stats.totalCount).toBe(1);
        expect(stats.activeCount).toBe(0);
    });

    it("광고 아티스트 수는 구독 수가 아니라 광고주 수 — 한 명이 여러 구독을 가질 수 있다", () => {
        const { stats } = computeAdminAdStats([
            row({ artist_id: "a1" }), row({ artist_id: "a1" }), row({ artist_id: "a2" }),
        ]);
        expect(stats.activeCount).toBe(3);
        expect(stats.activeArtistCount).toBe(2);
    });

    it("포인트 결제도 활성/전체가 따로 집계된다", () => {
        const { paymentBreakdown } = computeAdminAdStats([
            row({ expires_at: FUTURE, paid_by_points: 300 }),
            row({ expires_at: PAST, paid_by_points: 200 }),
        ]);
        expect(paymentBreakdown.totalPoints).toBe(500);
        expect(paymentBreakdown.activePoints).toBe(300);
    });

    it("빈 목록은 전부 0", () => {
        const { stats, paymentBreakdown } = computeAdminAdStats([]);
        expect(stats).toEqual({ totalRevenue: 0, activeCount: 0, activeArtistCount: 0, totalCount: 0 });
        expect(paymentBreakdown).toEqual({ totalCash: 0, totalPoints: 0, activeCash: 0, activePoints: 0 });
    });
});
