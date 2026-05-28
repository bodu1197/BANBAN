import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { ADMIN_GRANT_PREFIX } from "@/lib/supabase/ad-constants";
import { UUID_RE } from "@/lib/validation";

/** POST: 부여 취소 — status CANCELLED 변경 (idempotent — ACTIVE 인 경우만 update) */
export async function POST(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id: subscriptionId } = await context.params;
    if (!UUID_RE.test(subscriptionId)) {
        return NextResponse.json({ error: "유효하지 않은 subscriptionId" }, { status: 400 });
    }

    const { data: sub } = await auth.supabase
        .from("ad_subscriptions")
        .select("id, status, merchant_uid")
        .eq("id", subscriptionId)
        .single();
    if (!sub) return NextResponse.json({ error: "구독을 찾을 수 없습니다" }, { status: 404 });

    // 무료 부여(ADMIN_GRANT_*) 만 취소 가능 — 결제 구독은 환불 API 사용
    if (!sub.merchant_uid?.startsWith(ADMIN_GRANT_PREFIX)) {
        return NextResponse.json({ error: "관리자 부여 구독만 취소 가능합니다" }, { status: 400 });
    }
    if (sub.status === "CANCELLED" || sub.status === "EXPIRED") {
        return NextResponse.json({ error: "이미 종료된 구독입니다" }, { status: 400 });
    }

    // 조건부 update — fetch 와 update 사이 race condition 방지 (ACTIVE 가 아닌 다른 상태로 바뀌었으면 silent skip)
    const { error } = await auth.supabase
        .from("ad_subscriptions")
        .update({ status: "CANCELLED" })
        .eq("id", subscriptionId)
        .eq("status", "ACTIVE");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}
