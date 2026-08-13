/**
 * 광고 구독 상태 SSOT — 클라이언트/서버 양쪽에서 import 가능한 순수 모듈(서버 의존성 없음).
 *
 * ad_subscriptions.status 컬럼은 만료 크론(/api/cron/expire-ads)이 돌기 전까지 ACTIVE 로 남는다.
 * 반면 실제 광고 노출 쿼리(getActiveAdArtists / fetchAdExemptArtistIds / recordAdPortfolioEvents)는
 * 전부 `status='ACTIVE' AND expires_at > now()` 로 건다 — 즉 만료일이 지나면 광고는 이미 멈춘다.
 * 화면·집계가 status 컬럼만 읽으면 "노출은 끝났는데 활성으로 보이는" 거짓말이 된다(실제 사고: 부여 8건 중
 * 7건이 만료 후에도 '활성' 표시). 그래서 표시·집계·필터는 전부 이 모듈의 규칙 하나만 쓴다.
 *
 * 규칙: 광고가 나가는 중 = status 가 ACTIVE 이고 expires_at 이 유효한 미래 시각.
 * expires_at 이 NULL 이거나 파싱 불가면 "나가지 않는 중"으로 본다 — 노출 쿼리의 `expires_at > now`
 * 가 그런 행을 이미 제외하므로, 화면만 ACTIVE 라고 하면 또 같은 거짓말이 된다(fail-open 금지).
 */
import type { AdSubscriptionStatus } from "@/types/ads";

// `: AdSubscriptionStatus` 타입 주석을 붙이면 리터럴이 유니온으로 넓어져 adStatusFilterExpr 의 switch
// exhaustive 검사가 깨진다. satisfies 는 값 검증만 하고 리터럴 타입을 그대로 남긴다.
export const AD_STATUS_ACTIVE = "ACTIVE" satisfies AdSubscriptionStatus;
export const AD_STATUS_EXPIRED = "EXPIRED" satisfies AdSubscriptionStatus;
export const AD_STATUS_CANCELLED = "CANCELLED" satisfies AdSubscriptionStatus;
export const AD_STATUS_PENDING = "PENDING" satisfies AdSubscriptionStatus;

/** 허용 상태 전체 — 라우트 쿼리파라미터 검증(화이트리스트)도 이 목록 하나만 쓴다 */
export const AD_STATUSES: readonly AdSubscriptionStatus[] = [
    AD_STATUS_PENDING, AD_STATUS_ACTIVE, AD_STATUS_EXPIRED, AD_STATUS_CANCELLED,
];

/** 쿼리파라미터 등 외부 문자열이 유효한 상태값인지 (라우트에서 400 판정용) */
export function isAdStatus(value: string): value is AdSubscriptionStatus {
    return AD_STATUSES.some((s) => s === value);
}

/**
 * DB status 컬럼은 CHECK 제약 없는 text 라 4개 밖 값이 들어올 수 있다. 캐스팅으로 세탁하면 화면이
 * undefined 라벨로 죽으므로, 모르는 값은 EXPIRED(비노출)로 닫는다 — 활성으로 여는 실수가 더 비싸다.
 */
function toAdStatus(status: string): AdSubscriptionStatus {
    return AD_STATUSES.find((s) => s === status) ?? AD_STATUS_EXPIRED;
}

/** 만료일을 반영한 실질 상태. ACTIVE 인데 유효한 미래 만료 시각이 아니면 EXPIRED 로 본다. */
export function effectiveAdStatus(
    status: string,
    expiresAt: string | null | undefined,
    now: number = Date.now(),
): AdSubscriptionStatus {
    const known = toAdStatus(status);
    if (known !== AD_STATUS_ACTIVE) return known;
    const at = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
    return Number.isNaN(at) || at <= now ? AD_STATUS_EXPIRED : AD_STATUS_ACTIVE;
}

/** 지금 실제로 광고가 나가는 중인가 (노출 쿼리 조건과 동일한 규칙) */
export function isAdRunning(
    status: string,
    expiresAt: string | null | undefined,
    now: number = Date.now(),
): boolean {
    return effectiveAdStatus(status, expiresAt, now) === AD_STATUS_ACTIVE;
}

/**
 * 상태 탭 → PostgREST `.or()` 조건 문자열. 위 규칙의 SQL 판(版)이라 같은 파일에 둔다 —
 * 관리자 화면 두 곳(무료부여 목록·광고관리 목록)이 각자 구현하면 한쪽만 고쳐져 갈라진다.
 *
 * status 는 exhaustive switch 로 리터럴만 내보내고, 시각은 문자열이 아니라 Date/epoch 로 받아 여기서
 * 직렬화한다 — 둘 다 호출부가 준 문자열을 그대로 보간하지 않기 위해서다. 보간이 남아 있으면 안전성이
 * 호출부 검증에 의존하게 되고, 검증 없는 새 호출부가 생기는 순간 필터 주입 경로가 된다.
 */
export function adStatusFilterExpr(status: AdSubscriptionStatus, now: Date | number): string {
    const nowIso = new Date(now).toISOString();
    switch (toAdStatus(status)) {
        case AD_STATUS_ACTIVE:
            return `and(status.eq.ACTIVE,expires_at.gt."${nowIso}")`;
        case AD_STATUS_EXPIRED:
            // EXPIRED 로 이미 전이된 행 + 크론 미처리분(만료 시각 지남) + 만료 시각이 없는 행
            return [
                "status.eq.EXPIRED",
                `and(status.eq.ACTIVE,expires_at.lte."${nowIso}")`,
                "and(status.eq.ACTIVE,expires_at.is.null)",
            ].join(",");
        case AD_STATUS_PENDING:
            return "status.eq.PENDING";
        case AD_STATUS_CANCELLED:
            return "status.eq.CANCELLED";
    }
}
