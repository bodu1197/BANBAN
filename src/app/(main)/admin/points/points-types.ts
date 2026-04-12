// ─── Types & Constants for Points Admin ──────────────────

export interface PointStats {
    totalBalance: number;
    totalEarned: number;
    totalSpent: number;
    walletCount: number;
}

export interface PolicyItem {
    id: string;
    reason: string;
    amount: number;
    semi_amount: number | null;
    label: string;
    target: string;
    is_active: boolean;
    daily_limit: number | null;
}

export interface TransactionItem {
    id: string;
    type: string;
    amount: number;
    reason: string;
    description: string | null;
    created_at: string;
    point_wallets: {
        user_id: string;
        profiles: { username: string; nickname: string } | null;
    };
}

export interface AdminPointData {
    stats: PointStats;
    policies: PolicyItem[];
    transactions: TransactionItem[];
    total: number;
}

export const API_PATH = "/api/admin/points";
export const JSON_HEADERS = { "Content-Type": "application/json" };

const TARGET_MAP: Record<string, string> = { ARTIST: "아티스트", USER: "일반", ALL: "전체" };

export function getTargetLabel(target: string): string {
    // eslint-disable-next-line security/detect-object-injection -- Safe: display lookup
    return TARGET_MAP[target] ?? "전체";
}

const REASON_LABELS: Record<string, string> = {
    ATTENDANCE: "출석",
    PORTFOLIO_UPLOAD: "포트폴리오",
    REVIEW: "리뷰",
    WELCOME_BONUS: "웰컴보너스",
    AD_PAYMENT: "광고결제",
    AD_REFUND: "광고환불",
    ADMIN_GRANT: "관리자지급",
    ADMIN_DEDUCT: "관리자회수",
    ATTENDANCE_STREAK: "연속출석",
    SIGNUP_BONUS: "회원가입",
    LIKE: "좋아요",
    CHAT_START: "채팅",
};

export function getReasonLabel(reason: string): string {
    // eslint-disable-next-line security/detect-object-injection -- Safe: display-only lookup
    return REASON_LABELS[reason] ?? reason;
}
