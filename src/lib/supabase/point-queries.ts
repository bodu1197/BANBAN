import { createClient } from "./server";
import type { PointWallet, PointTransaction, PointTransactionType, PointReason } from "@/types/ads";
import { todayStartKST } from "@/lib/utils/format";

// ─── Artist Type Helper ────────────────────────────────

/** Get artist type for a user (null if not an artist) */
export async function getArtistType(userId: string): Promise<string | null> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("artists").select("type_artist").eq("user_id", userId).single();
    return (data as { type_artist: string } | null)?.type_artist ?? null;
}

// ─── Policy-based Point Amount ─────────────────────────

/** Get point amount from DB policy, considering artist type */
export async function getPolicyAmount(reason: string, artistType: string | null): Promise<number | null> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("point_policies")
        .select("amount, semi_amount, is_active")
        .eq("reason", reason)
        .single();

    if (!data) return null;
    const policy = data as { amount: number; semi_amount: number | null; is_active: boolean };
    if (!policy.is_active) return null;
    return artistType === "SEMI_PERMANENT" ? (policy.semi_amount ?? policy.amount) : policy.amount;
}

// ─── Wallet ──────────────────────────────────────────────

/** Get or create a point wallet for a user */
export async function getOrCreateWallet(userId: string): Promise<PointWallet> {
    const supabase = await createClient();

    // Try to get existing wallet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("point_wallets")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (data) return data as PointWallet;

    // Create new wallet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newWallet, error } = await (supabase as any)
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

/** Earn points — adds to wallet balance and creates transaction */
export async function earnPoints(params: EarnPointsParams): Promise<PointTransaction> {
    const { userId, amount, reason, description, expiresAt, referenceId } = params;
    const wallet = await getOrCreateWallet(userId);
    const supabase = await createClient();

    // Create transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tx, error: txError } = await (supabase as any)
        .from("point_transactions")
        .insert({
            wallet_id: wallet.id,
            type: "EARN" as PointTransactionType,
            amount,
            reason,
            description: description ?? null,
            expires_at: expiresAt ?? null,
            reference_id: referenceId ?? null,
        })
        .select()
        .single();

    if (txError) throw new Error(`Failed to create transaction: ${txError.message}`);

    // Update wallet balance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
        .from("point_wallets")
        .update({
            balance: wallet.balance + amount,
            total_earned: wallet.total_earned + amount,
            updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);

    return tx as PointTransaction;
}

interface SpendPointsParams {
    userId: string;
    amount: number;
    reason: PointReason;
    description?: string;
    referenceId?: string;
}

/** Spend points — deducts from wallet balance */
export async function spendPoints(params: SpendPointsParams): Promise<PointTransaction> {
    const { userId, amount, reason, description, referenceId } = params;
    const wallet = await getOrCreateWallet(userId);

    if (wallet.balance < amount) {
        throw new Error("INSUFFICIENT_POINTS");
    }

    const supabase = await createClient();

    // Create transaction (negative amount)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tx, error: txError } = await (supabase as any)
        .from("point_transactions")
        .insert({
            wallet_id: wallet.id,
            type: "SPEND" as PointTransactionType,
            amount: -amount,
            reason,
            description: description ?? null,
            reference_id: referenceId ?? null,
        })
        .select()
        .single();

    if (txError) throw new Error(`Failed to create transaction: ${txError.message}`);

    // Update wallet balance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
        .from("point_wallets")
        .update({
            balance: wallet.balance - amount,
            total_spent: wallet.total_spent + amount,
            updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);

    return tx as PointTransaction;
}

/** Get transaction history for a user */
export async function getPointHistory(
    userId: string,
    limit = 20,
    offset = 0,
): Promise<{ transactions: PointTransaction[]; total: number }> {
    const wallet = await getOrCreateWallet(userId);
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, count } = await (supabase as any)
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
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
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

/** Grant welcome bonus to a new artist (타투: 100,000P / 반영구: 30,000P) */
export async function grantWelcomeBonus(userId: string): Promise<PointTransaction> {
    const wallet = await getOrCreateWallet(userId);
    const supabase = await createClient();

    // Check if already granted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
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
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Find unexpired transactions past their expiry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: expiring } = await (supabase as any)
        .from("point_transactions")
        .select("id, wallet_id, amount")
        .eq("expired", false)
        .eq("type", "EARN")
        .not("expires_at", "is", null)
        .lt("expires_at", now);

    if (!expiring || expiring.length === 0) return 0;

    let expiredCount = 0;
    for (const tx of expiring as { id: string; wallet_id: string; amount: number }[]) {
        // Mark as expired
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
            .from("point_transactions")
            .update({ expired: true })
            .eq("id", tx.id);

        // Create expiry transaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
            .from("point_transactions")
            .insert({
                wallet_id: tx.wallet_id,
                type: "EXPIRE",
                amount: -tx.amount,
                reason: "WELCOME_BONUS",
                description: "기한 만료 포인트 소멸",
            });

        // Deduct from wallet
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: wallet } = await (supabase as any)
            .from("point_wallets")
            .select("balance")
            .eq("id", tx.wallet_id)
            .single();

        if (wallet) {
            const newBalance = Math.max(0, (wallet as { balance: number }).balance - tx.amount);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
                .from("point_wallets")
                .update({ balance: newBalance, updated_at: now })
                .eq("id", tx.wallet_id);
        }

        expiredCount++;
    }

    return expiredCount;
}
