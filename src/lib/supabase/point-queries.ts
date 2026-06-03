import { createAdminClient } from "./server";
import type { PointWallet, PointTransaction, PointReason } from "@/types/ads";
import { todayStartKST } from "@/lib/utils/format";

// ─── Artist Type Helper ────────────────────────────────

/** Get artist type for a user (null if not an artist) */
export async function getArtistType(userId: string): Promise<string | null> {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from("artists").select("type_artist").eq("user_id", userId).single();
    return data?.type_artist ?? null;
}

// ─── Policy-based Point Amount ─────────────────────────

/** Get point amount from DB policy, considering artist type */
export async function getPolicyAmount(reason: string, artistType: string | null): Promise<number | null> {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from("point_policies")
        .select("amount, semi_amount, is_active")
        .eq("reason", reason)
        .single();

    if (!data) return null;
    if (!data.is_active) return null;
    return artistType === "SEMI_PERMANENT" ? (data.semi_amount ?? data.amount) : data.amount;
}

// ─── Wallet ──────────────────────────────────────────────

/** Get or create a point wallet for a user */
export async function getOrCreateWallet(userId: string): Promise<PointWallet> {
    const supabase = createAdminClient();

    // Try to get existing wallet
    const { data } = await supabase
        .from("point_wallets")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (data) return data as PointWallet;

    // Create new wallet
    const { data: newWallet, error } = await supabase
        .from("point_wallets")
        .insert({ user_id: userId })
        .select()
        .single();

    if (error) throw new Error(`Failed to create wallet: ${error.message}`);
    return newWallet as PointWallet;
}

/** Get wallet balance for a user */
export async function getWalletBalance(userId: string): Promise<number> {
    const wallet = await getOrCreateWallet(userId);
    return wallet.balance;
}

// ─── Transactions ────────────────────────────────────────

interface EarnPointsParams {
    userId: string;
    amount: number;
    reason: PointReason;
    description?: string;
    expiresAt?: string | null;
    referenceId?: string;
}

/**
 * Earn points — 원자적 RPC(earn_points)로 잔액 증가 + 거래 기록.
 * 기존 read-modify-write(절대값 할당)는 동시요청 시 lost-update 발생 → 원자적 증감으로 교체.
 */
export async function earnPoints(params: EarnPointsParams): Promise<PointTransaction> {
    const { userId, amount, reason, description, expiresAt, referenceId } = params;
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("earn_points", {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason,
        p_description: description ?? null,
        p_expires_at: expiresAt ?? null,
        p_reference_id: referenceId ?? null,
    });

    if (error) throw new Error(`Failed to earn points: ${error.message}`);
    const tx = data?.[0];
    if (!tx) throw new Error("Failed to earn points: no transaction returned");
    return tx as PointTransaction;
}

interface SpendPointsParams {
    userId: string;
    amount: number;
    reason: PointReason;
    description?: string;
    referenceId?: string;
}

/**
 * Spend points — 원자적 RPC(spend_points)로 잔액 충분 시에만 차감 + 거래 기록.
 * 행 잠금 + 가드된 상대 차감이라 동시요청에도 더블스펜드/음수잔액 불가. 부족하면 INSUFFICIENT_POINTS.
 */
export async function spendPoints(params: SpendPointsParams): Promise<PointTransaction> {
    const { userId, amount, reason, description, referenceId } = params;
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("spend_points", {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason,
        p_description: description ?? null,
        p_reference_id: referenceId ?? null,
    });

    if (error) {
        if (error.message.includes("INSUFFICIENT_POINTS")) throw new Error("INSUFFICIENT_POINTS");
        throw new Error(`Failed to spend points: ${error.message}`);
    }
    const tx = data?.[0];
    if (!tx) throw new Error("Failed to spend points: no transaction returned");
    return tx as PointTransaction;
}

/**
 * 환불 포인트 적립(best-effort) — 실패해도 throw 하지 않고 로깅만 한다.
 * 호출 시점엔 구독이 이미 취소(claim)된 상태라, 적립 실패는 수동 보정 대상이므로 반드시 로깅.
 * amount<=0 이면 no-op. context 는 호출 출처(예: "ads/refund").
 */
export async function refundPointsBestEffort(
    params: { userId: string; amount: number; description: string; context: string },
): Promise<void> {
    const { userId, amount, description, context } = params;
    if (amount <= 0) return;
    try {
        await earnPoints({ userId, amount, reason: "AD_REFUND", description });
    } catch (e) {
        // eslint-disable-next-line no-console -- 구독 취소 완료 후 환불 적립 실패 → 수동 보정 필요, 반드시 로깅
        console.error(`[${context}] 포인트 환불 실패(구독 취소 완료, 수동 보정 필요):`, { userId, amount, e });
    }
}

/** Get transaction history for a user */
export async function getPointHistory(
    userId: string,
    limit = 20,
    offset = 0,
): Promise<{ transactions: PointTransaction[]; total: number }> {
    const wallet = await getOrCreateWallet(userId);
    const supabase = createAdminClient();

    const { data, count } = await supabase
        .from("point_transactions")
        .select("*", { count: "exact" })
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    return {
        transactions: (data ?? []) as PointTransaction[],
        total: count ?? 0,
    };
}

// ─── Daily Limit ────────────────────────────────────────

// 일일 적립 한도 enforcement 의 단일 출처(SSOT) — 서버 트리거 reason(LIKE/REVIEW/CHAT_START 등)용.
// 여기 없는 reason 은 한도 없이 적립된다(earnPointsWithLimit fallback). 새 한도 reason 추가 시 반드시 등록.
// 클라이언트 호출 1회성 reason(WELCOME_BONUS/PORTFOLIO_UPLOAD)은 한도가 아니라 멱등 RPC
// (earn_points_once / earn_points_once_ref)로 처리한다. (DB point_policies.daily_limit 컬럼은 현재 미사용)
const DAILY_LIMITS: Partial<Record<PointReason, number>> = {
    ATTENDANCE: 1,
    REVIEW: 1,
    CHAT_START: 1,
    LIKE: 5,
};

/**
 * Earn points with daily limit — 한도 검사와 적립을 원자적 RPC(earn_points_daily_limited)로 수행.
 * 지갑 행 잠금으로 동시 요청을 직렬화해 "count→적립" 경쟁(H5: 한도 초과 적립)을 제거.
 * 한도 없는 reason 은 일반 earnPoints. 한도 도달이면 null.
 */
export async function earnPointsWithLimit(params: EarnPointsParams): Promise<PointTransaction | null> {
    const limit = DAILY_LIMITS[params.reason];
    if (!limit) return earnPoints(params); // 한도 없는 reason

    const { userId, amount, reason, description, expiresAt, referenceId } = params;
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("earn_points_daily_limited", {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason,
        p_daily_limit: limit,
        p_day_start: todayStartKST(),
        p_description: description ?? null,
        p_expires_at: expiresAt ?? null,
        p_reference_id: referenceId ?? null,
    });

    if (error) throw new Error(`Failed to earn points (daily-limited): ${error.message}`);
    return (data?.[0] as PointTransaction) ?? null; // 빈 결과 = 한도 도달
}

// ─── Welcome Bonus ──────────────────────────────────────

/**
 * Grant welcome bonus to a new artist — 사용자당 1회만(원자적 멱등, earn_points_once).
 * 반복 호출/재시도해도 1회만 지급(파밍 차단). 이미 지급됐으면 null.
 */
export async function grantWelcomeBonus(userId: string): Promise<PointTransaction | null> {
    const artistType = await getArtistType(userId);
    // DB 정책 우선, 없으면 코드 기본값
    const policyAmount = await getPolicyAmount("WELCOME_BONUS", artistType);
    let amount = policyAmount;
    if (amount === null) {
        const { DEFAULT_POINT_RULES, getPointAmount } = await import("@/types/ads");
        const rule = DEFAULT_POINT_RULES.find(r => r.reason === "WELCOME_BONUS");
        amount = rule ? getPointAmount(rule, artistType ?? undefined) : 100_000;
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("earn_points_once", {
        p_user_id: userId,
        p_amount: amount,
        p_reason: "WELCOME_BONUS",
        p_description: "신규 아티스트 웰컴 보너스",
    });
    if (error) throw new Error(`Failed to grant welcome bonus: ${error.message}`);
    return (data?.[0] as PointTransaction) ?? null; // null = 이미 지급됨
}

interface EarnOnceRefParams {
    userId: string;
    amount: number;
    reason: PointReason;
    referenceId: string;
    description?: string;
    expiresAt?: string | null;
}

/**
 * 이벤트 1회성 적립 — (wallet, reason, referenceId) 당 1회만(원자적 멱등).
 * 예: PORTFOLIO_UPLOAD(referenceId=portfolioId). 중복(같은 reference 재호출)이면 null.
 */
export async function earnPointsOnceRef(params: EarnOnceRefParams): Promise<PointTransaction | null> {
    const { userId, amount, reason, referenceId, description, expiresAt } = params;
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("earn_points_once_ref", {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason,
        p_reference_id: referenceId,
        p_description: description ?? null,
        p_expires_at: expiresAt ?? null,
    });
    if (error) throw new Error(`Failed to earn points (once-ref): ${error.message}`);
    return (data?.[0] as PointTransaction) ?? null;
}

// ─── Expiration ──────────────────────────────────────────

/** Expire unused welcome bonus points past their expiration date */
export async function expireOldPoints(): Promise<number> {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Find unexpired transactions past their expiry
    const { data: expiring } = await supabase
        .from("point_transactions")
        .select("id, wallet_id, amount")
        .eq("expired", false)
        .eq("type", "EARN")
        .not("expires_at", "is", null)
        .lt("expires_at", now);

    if (!expiring || expiring.length === 0) return 0;

    // Batch 1: 모든 만료 tx 를 한 번에 expired=true
    const txIds = expiring.map((tx) => tx.id);
    await supabase
        .from("point_transactions")
        .update({ expired: true })
        .in("id", txIds);

    // Batch 2: 모든 expiry transaction 한 번에 insert
    const expiryRows = expiring.map((tx) => ({
        wallet_id: tx.wallet_id,
        type: "EXPIRE" as const,
        amount: -tx.amount,
        reason: "WELCOME_BONUS" as const,
        description: "기한 만료 포인트 소멸",
    }));
    await supabase.from("point_transactions").insert(expiryRows);

    // Wallet 별 차감액 합산 (같은 wallet 의 여러 tx 합치기)
    const walletDeductions = new Map<string, number>();
    for (const tx of expiring) {
        walletDeductions.set(tx.wallet_id, (walletDeductions.get(tx.wallet_id) ?? 0) + tx.amount);
    }

    // Wallet 들의 현재 balance 한 번에 조회 후 병렬 update
    const walletIds = [...walletDeductions.keys()];
    const { data: wallets } = await supabase
        .from("point_wallets")
        .select("id, balance")
        .in("id", walletIds);

    if (wallets) {
        await Promise.all(
            (wallets as Array<{ id: string; balance: number }>).map(async (wallet) => {
                const deduction = walletDeductions.get(wallet.id) ?? 0;
                const newBalance = Math.max(0, wallet.balance - deduction);
                await supabase
                    .from("point_wallets")
                    .update({ balance: newBalance, updated_at: now })
                    .eq("id", wallet.id);
            }),
        );
    }

    return expiring.length;
}
