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

const DAILY_LIMITS: Partial<Record<PointReason, number>> = {
    ATTENDANCE: 1,
    REVIEW: 1,
    CHAT_START: 1,
    LIKE: 5,
};

/** Check if user has exceeded daily limit for a given reason */
export async function checkDailyLimit(userId: string, reason: PointReason): Promise<boolean> {
    // eslint-disable-next-line security/detect-object-injection -- Safe: known key lookup
    const limit = DAILY_LIMITS[reason];
    if (!limit) return true; // no limit

    const wallet = await getOrCreateWallet(userId);
    const supabase = createAdminClient();

    const { count } = await supabase
        .from("point_transactions")
        .select("id", { count: "exact", head: true })
        .eq("wallet_id", wallet.id)
        .eq("reason", reason)
        .eq("type", "EARN")
        .gte("created_at", todayStartKST());

    return (count ?? 0) < limit;
}

/** Earn points with daily limit check — returns null if limit exceeded */
export async function earnPointsWithLimit(params: EarnPointsParams): Promise<PointTransaction | null> {
    const canEarn = await checkDailyLimit(params.userId, params.reason);
    if (!canEarn) return null;
    return earnPoints(params);
}

// ─── Welcome Bonus ──────────────────────────────────────

/** Grant welcome bonus to a new artist (30,000P) */
export async function grantWelcomeBonus(userId: string): Promise<PointTransaction> {
    const wallet = await getOrCreateWallet(userId);
    const supabase = createAdminClient();

    // Check if already granted
    const { data: existing } = await supabase
        .from("point_transactions")
        .select("id")
        .eq("wallet_id", wallet.id)
        .eq("reason", "WELCOME_BONUS")
        .limit(1);

    if (existing && existing.length > 0) {
        throw new Error("WELCOME_BONUS_ALREADY_GRANTED");
    }

    const artistType = await getArtistType(userId);
    // DB 정책 우선, 없으면 코드 기본값
    const policyAmount = await getPolicyAmount("WELCOME_BONUS", artistType);
    let amount = policyAmount;
    if (amount === null) {
        const { DEFAULT_POINT_RULES, getPointAmount } = await import("@/types/ads");
        const rule = DEFAULT_POINT_RULES.find(r => r.reason === "WELCOME_BONUS");
        amount = rule ? getPointAmount(rule, artistType ?? undefined) : 100_000;
    }

    return earnPoints({
        userId,
        amount,
        reason: "WELCOME_BONUS",
        description: "신규 아티스트 웰컴 보너스",
    });
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
