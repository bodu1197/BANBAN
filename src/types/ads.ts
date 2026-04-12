// ─── Ad Plans ────────────────────────────────────────────
export interface AdPlan {
    id: string;
    name: string;
    price: number;
    duration_days: number;
    is_active: boolean;
    artist_type: "TATTOO" | "SEMI_PERMANENT";
    max_portfolios: number;
    created_at: string;
}

// ─── Ad Duration Options ────────────────────────────────
export interface AdDurationOption {
    id: string;
    months: number;
    label: string;
    discount_percent: number;
    is_active: boolean;
    sort_order: number;
}

// ─── Ad Subscriptions ────────────────────────────────────
export type AdSubscriptionStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export interface AdSubscription {
    id: string;
    artist_id: string;
    plan_id: string;
    status: AdSubscriptionStatus;
    started_at: string | null;
    expires_at: string | null;
    price_paid: number;
    paid_by_points: number;
    paid_by_cash: number;
    duration_months: number;
    imp_uid: string | null;
    merchant_uid: string | null;
    impression_count: number;
    click_count: number;
    created_at: string;
    // Joined
    plan?: AdPlan;
    artist?: { id: string; title: string; profile_image_path: string | null };
}

// ─── Ad Events ───────────────────────────────────────────
export type AdEventType = "IMPRESSION" | "CLICK";
export type AdPlacement = "BANNER" | "SEARCH_TOP" | "BOOST" | "FEATURED";

export interface AdEvent {
    id: string;
    subscription_id: string;
    event_type: AdEventType;
    placement: AdPlacement;
    page_path: string | null;
    created_at: string;
}

// ─── Points ──────────────────────────────────────────────
export interface PointWallet {
    id: string;
    user_id: string;
    balance: number;
    total_earned: number;
    total_spent: number;
    created_at: string;
    updated_at: string;
}

export type PointTransactionType = "EARN" | "SPEND" | "EXPIRE" | "REFUND";
export type PointReason =
    | "ATTENDANCE"
    | "ATTENDANCE_STREAK"
    | "SIGNUP_BONUS"
    | "PORTFOLIO_UPLOAD"
    | "REVIEW"
    | "CHAT_START"
    | "LIKE"
    | "WELCOME_BONUS"
    | "AD_PAYMENT"
    | "AD_REFUND"
    | "ADMIN_GRANT"
    | "ADMIN_DEDUCT";

export interface PointTransaction {
    id: string;
    wallet_id: string;
    type: PointTransactionType;
    amount: number;
    reason: PointReason;
    description: string | null;
    expires_at: string | null;
    expired: boolean;
    reference_id: string | null;
    created_at: string;
}

// ─── Point Earning Rules ─────────────────────────────────
export interface PointRule {
    reason: PointReason;
    amount: number;
    /** 반���구 아티스트 전용 지급액 (타투 대비 ~30%). 없으면 amount 사용 */
    semiAmount?: number;
    label: string;
    /** "ARTIST" 전용, "USER" 전용, "ALL" = 양쪽 */
    target: "ARTIST" | "USER" | "ALL";
}

export const DEFAULT_POINT_RULES: PointRule[] = [
    { reason: "ATTENDANCE", amount: 1_000, semiAmount: 300, label: "출석 체크", target: "ALL" },
    { reason: "ATTENDANCE_STREAK", amount: 5_000, semiAmount: 1_500, label: "7일 연속 출석 보너스", target: "ALL" },
    { reason: "SIGNUP_BONUS", amount: 30_000, semiAmount: 9_000, label: "회원가입 축하", target: "ALL" },
    { reason: "REVIEW", amount: 20_000, semiAmount: 6_000, label: "리뷰 작성", target: "USER" },
    { reason: "LIKE", amount: 500, semiAmount: 150, label: "좋아요", target: "ALL" },
    { reason: "PORTFOLIO_UPLOAD", amount: 1_000, semiAmount: 300, label: "포트폴리오 등록", target: "ARTIST" },
    { reason: "WELCOME_BONUS", amount: 100_000, semiAmount: 30_000, label: "신규 아티스트 웰컴", target: "ARTIST" },
];

/** 아티스트 타입에 따른 ���인트 지급액 반환 */
export function getPointAmount(rule: PointRule, artistType?: string): number {
    return artistType === "SEMI_PERMANENT" ? (rule.semiAmount ?? rule.amount) : rule.amount;
}

// ─── API Request / Response ──────────────────────────────
export interface AdPurchaseRequest {
    planId: string;
    usePoints: number;     // 포인트 사용 금액
    durationMonths: number; // 구매 기간 (개월)
}

export interface AdPurchaseResponse {
    subscriptionId: string;
    merchantUid: string;
    cashAmount: number;    // PortOne으로 결제할 금액 (0이면 포인트로 전액)
    planName: string;
}

export interface PointEarnRequest {
    reason: PointReason;
    referenceId?: string;
}

// ─── Ad Portfolio Slots ─────────────────────────────────
export interface AdPortfolioSlot {
    id: string;
    subscription_id: string;
    portfolio_id: string;
    created_at: string;
}

// ─── Active Ad (검색 결과 렌더링용) ──────────────────────
export interface ActiveAdArtist {
    artist_id: string;
    subscription_id: string;
    artist_title: string;
    profile_image_path: string | null;
    portfolio_ids: string[];
}
