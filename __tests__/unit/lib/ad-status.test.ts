import { describe, it, expect } from "vitest";
import { effectiveAdStatus, isAdRunning, adStatusFilterExpr } from "@/lib/ad-status";

const NOW = new Date("2026-08-14T00:00:00.000Z").getTime();
const NOW_ISO = new Date(NOW).toISOString();
const PAST = "2026-07-02T00:00:00.000Z";
const FUTURE = "2026-10-22T00:00:00.000Z";

describe("effectiveAdStatus", () => {
    it("ACTIVE + 만료일 지남 → EXPIRED (관리자 화면이 '활성' 으로 거짓말하던 실제 버그)", () => {
        expect(effectiveAdStatus("ACTIVE", PAST, NOW)).toBe("EXPIRED");
    });

    it("ACTIVE + 만료 전 → ACTIVE", () => {
        expect(effectiveAdStatus("ACTIVE", FUTURE, NOW)).toBe("ACTIVE");
    });

    it("만료 시각 정각은 이미 끝난 것으로 본다 (노출 쿼리 expires_at > now 와 동일)", () => {
        expect(effectiveAdStatus("ACTIVE", NOW_ISO, NOW)).toBe("EXPIRED");
    });

    it("만료 시각이 없거나 깨졌으면 EXPIRED — 노출 쿼리도 그런 행을 제외하므로 fail-open 금지", () => {
        expect(effectiveAdStatus("ACTIVE", null, NOW)).toBe("EXPIRED");
        expect(effectiveAdStatus("ACTIVE", undefined, NOW)).toBe("EXPIRED");
        expect(effectiveAdStatus("ACTIVE", "깨진값", NOW)).toBe("EXPIRED");
    });

    it("ACTIVE 가 아닌 상태는 만료일과 무관하게 그대로", () => {
        expect(effectiveAdStatus("PENDING", PAST, NOW)).toBe("PENDING");
        expect(effectiveAdStatus("CANCELLED", FUTURE, NOW)).toBe("CANCELLED");
        expect(effectiveAdStatus("EXPIRED", FUTURE, NOW)).toBe("EXPIRED");
    });

    it("DB 에 4개 밖 값이 들어와도 활성으로 열지 않는다 (fail-close)", () => {
        expect(effectiveAdStatus("REFUNDED", FUTURE, NOW)).toBe("EXPIRED");
        expect(isAdRunning("REFUNDED", FUTURE, NOW)).toBe(false);
        expect(isAdRunning("", FUTURE, NOW)).toBe(false);
    });

    it("now 를 생략하면 현재 시각 기준 — 프로덕션 호출부가 전부 이 형태", () => {
        expect(effectiveAdStatus("ACTIVE", "2000-01-01T00:00:00.000Z")).toBe("EXPIRED");
        expect(effectiveAdStatus("ACTIVE", "2999-01-01T00:00:00.000Z")).toBe("ACTIVE");
    });
});

describe("isAdRunning", () => {
    it("실제 노출 중인 건만 true", () => {
        expect(isAdRunning("ACTIVE", FUTURE, NOW)).toBe(true);
        expect(isAdRunning("ACTIVE", PAST, NOW)).toBe(false);
        expect(isAdRunning("ACTIVE", null, NOW)).toBe(false);
        expect(isAdRunning("PENDING", FUTURE, NOW)).toBe(false);
        expect(isAdRunning("CANCELLED", FUTURE, NOW)).toBe(false);
    });

    it("now 를 생략해도 동작 — 프로덕션 호출부가 전부 이 형태", () => {
        expect(isAdRunning("ACTIVE", "2999-01-01T00:00:00.000Z")).toBe(true);
        expect(isAdRunning("ACTIVE", "2000-01-01T00:00:00.000Z")).toBe(false);
    });
});

describe("adStatusFilterExpr — PostgREST or() 조건", () => {
    it("ACTIVE 는 만료 전 조건까지 AND 로 묶는다", () => {
        expect(adStatusFilterExpr("ACTIVE", NOW)).toBe(
            `and(status.eq.ACTIVE,expires_at.gt."${NOW_ISO}")`,
        );
    });

    it("EXPIRED 는 크론 처리분 + 미처리분(만료 지남/만료일 없음) 3절을 최상위 콤마로 잇는다", () => {
        expect(adStatusFilterExpr("EXPIRED", NOW)).toBe(
            `status.eq.EXPIRED,and(status.eq.ACTIVE,expires_at.lte."${NOW_ISO}"),and(status.eq.ACTIVE,expires_at.is.null)`,
        );
    });

    it("나머지 상태는 단순 일치", () => {
        expect(adStatusFilterExpr("PENDING", NOW)).toBe("status.eq.PENDING");
        expect(adStatusFilterExpr("CANCELLED", NOW)).toBe("status.eq.CANCELLED");
    });

    it("시각 값은 큰따옴표로 감싼다 — 빠지면 or() 파싱이 깨져 500", () => {
        for (const status of ["ACTIVE", "EXPIRED"] as const) {
            expect(adStatusFilterExpr(status, NOW)).toContain(`"${NOW_ISO}"`);
        }
    });
});
