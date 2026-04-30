import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { escapeIlike } from "@/lib/supabase/queries";

// ─── Types ───────────────────────────────────────────────

interface GrantBody {
    userId: string;
    amount: number;
    description: string;
}

interface WalletData {
    id: string;
    balance: number;
    total_earned: number;
    total_spent: number;
}

// ─── Helpers ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generic client
async function getOrCreateWalletAdmin(supabase: any, userId: string): Promise<WalletData> {
    const { data } = await supabase.from("point_wallets").select("*").eq("user_id", userId).single();
    if (data) return data as WalletData;

    const { data: created, error } = await supabase.from("point_wallets").insert({ user_id: userId }).select().single();
    if (error) throw new Error(error.message);
    return created as WalletData;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generic client
async function createTransaction(supabase: any, walletId: string, type: string, amount: number, reason: string, description: string): Promise<void> {
    await supabase.from("point_transactions").insert({ wallet_id: walletId, type, amount, reason, description });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generic client
async function updateBalance(supabase: any, wallet: WalletData, delta: number, earnDelta: number, spendDelta: number): Promise<void> {
    await supabase.from("point_wallets").update({
        balance: wallet.balance + delta,
        total_earned: wallet.total_earned + earnDelta,
        total_spent: wallet.total_spent + spendDelta,
        updated_at: new Date().toISOString(),
    }).eq("id", wallet.id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generic client
async function aggregateStats(sb: any): Promise<{ totalBalance: number; totalEarned: number; totalSpent: number; walletCount: number }> {
    const { data: wallets } = await sb.from("point_wallets").select("balance, total_earned, total_spent");
    const stats = { totalBalance: 0, totalEarned: 0, totalSpent: 0, walletCount: 0 };
    for (const w of (wallets ?? []) as WalletData[]) {
        stats.totalBalance += w.balance;
        stats.totalEarned += w.total_earned;
        stats.totalSpent += w.total_spent;
        stats.walletCount++;
    }
    return stats;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generic client
async function searchWalletIds(sb: any, search: string): Promise<string[] | null> {
    const { data } = await sb
        .from("point_wallets")
        .select("id, profiles:user_id(username, nickname)")
        .or(`username.ilike.%${escapeIlike(search)}%,nickname.ilike.%${escapeIlike(search)}%`, { referencedTable: "profiles" });
    if (!data || data.length === 0) return null;
    return (data as { id: string }[]).map((w) => w.id);
}

// ─── GET — 포인트 관리 데이터 ────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const search = url.searchParams.get("search") ?? "";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const offset = (page - 1) * 20;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = auth.supabase as any;
    const [stats, { data: policies }] = await Promise.all([
        aggregateStats(sb),
        sb.from("point_policies").select("*").order("created_at", { ascending: true }),
    ]);

    let txQuery = sb
        .from("point_transactions")
        .select("*, point_wallets!inner(user_id, profiles:user_id(username, nickname))", { count: "exact" })
        .order("created_at", { ascending: false });

    if (search) {
        const walletIds = await searchWalletIds(sb, search);
        if (!walletIds) return NextResponse.json({ stats, policies: policies ?? [], transactions: [], total: 0 });
        txQuery = txQuery.in("wallet_id", walletIds);
    }

    const { data: transactions, count } = await txQuery.range(offset, offset + 19);

    return NextResponse.json({ stats, policies: policies ?? [], transactions: transactions ?? [], total: count ?? 0 });
}

// ─── Resolve User ID ────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveUserId(sb: any, input: string): Promise<string | null> {
    if (UUID_REGEX.test(input)) return input;

    // Search by username or nickname
    const { data } = await sb
        .from("profiles")
        .select("id")
        .or(`username.eq.${input},nickname.eq.${input}`)
        .is("deleted_at", null)
        .limit(1)
        .single();

    return (data as { id: string } | null)?.id ?? null;
}

// ─── POST — 포인트 지급 ──────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    try {
        const body = await request.json() as GrantBody;
        if (!body.userId || !body.amount || !body.description) {
            return NextResponse.json({ error: "userId, amount, description 모두 입력해주세요" }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = auth.supabase as any;
        const resolvedId = await resolveUserId(sb, body.userId);
        if (!resolvedId) {
            return NextResponse.json({ error: `회원을 찾을 수 없습니다: ${body.userId}` }, { status: 404 });
        }

        const wallet = await getOrCreateWalletAdmin(sb, resolvedId);
        await createTransaction(sb, wallet.id, "EARN", body.amount, "ADMIN_GRANT", body.description);
        await updateBalance(sb, wallet, body.amount, body.amount, 0);

        return NextResponse.json({ success: true, newBalance: wallet.balance + body.amount });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "포인트 지급 실패" }, { status: 500 });
    }
}

// ─── DELETE — 포인트 회수 (차감) ─────────────────────────

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    try {
        const body = await request.json() as GrantBody;
        if (!body.userId || !body.amount || !body.description) {
            return NextResponse.json({ error: "userId, amount, description 모두 입력해주세요" }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = auth.supabase as any;
        const resolvedId = await resolveUserId(sb, body.userId);
        if (!resolvedId) {
            return NextResponse.json({ error: `회원을 찾을 수 없습니다: ${body.userId}` }, { status: 404 });
        }

        const wallet = await getOrCreateWalletAdmin(sb, resolvedId);
        if (wallet.balance < body.amount) {
            return NextResponse.json({ error: "보유 포인트가 부족합니다" }, { status: 400 });
        }

        await createTransaction(sb, wallet.id, "SPEND", -body.amount, "ADMIN_DEDUCT", body.description);
        await updateBalance(sb, wallet, -body.amount, 0, body.amount);

        return NextResponse.json({ success: true, newBalance: wallet.balance - body.amount });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "포인트 회수 실패" }, { status: 500 });
    }
}

// ─── PATCH — 포인트 정책 수정 ────────────────────────────

export async function PATCH(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json() as { id: string; amount?: number; semi_amount?: number | null; is_active?: boolean };
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.amount !== undefined) updates.amount = body.amount;
    if (body.semi_amount !== undefined) updates.semi_amount = body.semi_amount;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (auth.supabase as any).from("point_policies").update(updates).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
