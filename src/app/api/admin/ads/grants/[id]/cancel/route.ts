import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { ADMIN_GRANT_PREFIX } from "@/lib/supabase/ad-constants";
import { UUID_RE } from "@/lib/validation";
import { isAdRunning, AD_STATUS_ACTIVE } from "@/lib/ad-status";
import { cancelSubscription } from "@/lib/supabase/ad-queries";

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
        .select("id, status, expires_at, merchant_uid")
        .eq("id", subscriptionId)
        .single();
    if (!sub) return NextResponse.json({ error: "구독을 찾을 수 없습니다" }, { status: 404 });

    // 무료 부여(ADMIN_GRANT_*) 만 취소 가능 — 결제 구독은 환불 API 사용
    if (!sub.merchant_uid?.startsWith(ADMIN_GRANT_PREFIX)) {
        return NextResponse.json({ error: "관리자 부여 구독만 취소 가능합니다" }, { status: 400 });
    }
    // 광고가 실제로 나가는 중일 때만 취소 가능 — 화면 게이트(isAdRunning)와 같은 기준.
    // status 컬럼만 보면 이미 끝난 부여가 CANCELLED 로 잘못 기록된다.
    if (!isAdRunning(sub.status, sub.expires_at)) {
        return NextResponse.json({ error: "이미 종료된 구독입니다" }, { status: 400 });
    }

    // 원자적 claim 재사용(ad-queries) — SELECT 와 UPDATE 사이에 상태가 바뀌면 0행이 되는데,
    // 그때 ok:true 를 주면 "취소했다" 는 거짓 응답이 된다. 영향 행 수를 보고 409 로 알린다.
    const claimed = await cancelSubscription(subscriptionId, AD_STATUS_ACTIVE);
    if (!claimed) return NextResponse.json({ error: "이미 종료된 구독입니다" }, { status: 409 });

    return NextResponse.json({ ok: true });
}
