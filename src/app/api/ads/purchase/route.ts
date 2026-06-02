import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { spendPoints, earnPoints } from "@/lib/supabase/point-queries";
import { createAdSubscription, getAdPlans, getAdDurationOptions } from "@/lib/supabase/ad-queries";
import type { AdDurationOption, AdPlan, AdPurchaseRequest, AdPurchaseResponse } from "@/types/ads";

function calculateTotalPrice(monthlyPrice: number, months: number, discountPercent: number): number {
    const raw = monthlyPrice * months;
    return Math.round(raw * (100 - discountPercent) / 100);
}

async function getArtist(userId: string): Promise<{ id: string; type_artist: string } | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("artists").select("id, type_artist").eq("user_id", userId).single();
    return data as { id: string; type_artist: string } | null;
}

function getExpectedPlanType(): "SEMI_PERMANENT" {
    return "SEMI_PERMANENT";
}

async function validatePurchase(body: AdPurchaseRequest): Promise<
    { plan: AdPlan; duration: AdDurationOption; totalPrice: number } | { error: string }
> {
    const [plans, durations] = await Promise.all([getAdPlans(), getAdDurationOptions()]);
    const plan = plans.find(p => p.id === body.planId);
    if (!plan) return { error: "plan_not_found" };

    const duration = durations.find(d => d.months === (body.durationMonths ?? 1));
    if (!duration) return { error: "invalid_duration" };

    const totalPrice = calculateTotalPrice(plan.price, duration.months, duration.discount_percent);
    return { plan, duration, totalPrice };
}

async function processPointPayment(userId: string, pointsToUse: number, planName: string, durationLabel: string): Promise<string | null> {
    if (pointsToUse <= 0) return null;
    try {
        // spendPoints 는 원자적(잔액 충분 시에만 차감) — 사전 read 체크 불필요(TOCTOU 제거).
        await spendPoints({
            userId,
            amount: pointsToUse,
            reason: "AD_PAYMENT",
            description: `${planName} ${durationLabel} 광고 결제 (포인트)`,
        });
        return null;
    } catch (e) {
        if (e instanceof Error && e.message === "INSUFFICIENT_POINTS") return "insufficient_points";
        throw e;
    }
}

/** 요청 body 검증 — 에러 코드 반환(없으면 null). POST 복잡도 분리. */
function validatePurchaseBody(body: AdPurchaseRequest): string | null {
    if (!body.planId) return "missing_plan_id";
    if (body.durationMonths !== undefined && (
        typeof body.durationMonths !== "number" || body.durationMonths < 1 || !Number.isInteger(body.durationMonths)
    )) return "invalid_duration";
    const usePoints = body.usePoints ?? 0;
    if (typeof usePoints !== "number" || usePoints < 0 || !Number.isFinite(usePoints)) return "invalid_use_points";
    return null;
}

type SubParams = Parameters<typeof createAdSubscription>[0];

/** 구독 생성 + 실패 시 포인트 보상 환불 — 정합성 깨짐(포인트만 빠짐) 방지. */
async function createSubscriptionWithRefund(
    params: SubParams,
    userId: string,
    pointsToUse: number,
    refundDesc: string,
): Promise<{ subscription: Awaited<ReturnType<typeof createAdSubscription>> } | { error: string; detail: string }> {
    try {
        return { subscription: await createAdSubscription(params) };
    } catch (e) {
        if (pointsToUse > 0) {
            try {
                await earnPoints({ userId, amount: pointsToUse, reason: "AD_REFUND", description: refundDesc });
            } catch (refundErr) {
                // eslint-disable-next-line no-console -- 환불 실패는 수동 보정이 필요하므로 반드시 로깅
                console.error("[ads/purchase] 포인트 환불 실패(수동 보정 필요):", { userId, pointsToUse, refundErr });
            }
        }
        return { error: "subscription_create_failed", detail: e instanceof Error ? e.message : "unknown" };
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const artist = await getArtist(user.id);
    if (!artist) return NextResponse.json({ error: "not_artist" }, { status: 403 });

    const body = await request.json() as AdPurchaseRequest;
    const bodyError = validatePurchaseBody(body);
    if (bodyError) return NextResponse.json({ error: bodyError }, { status: 400 });

    const result = await validatePurchase(body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

    const { plan, duration, totalPrice } = result;
    if (plan.artist_type !== getExpectedPlanType()) {
        return NextResponse.json({ error: "plan_type_mismatch" }, { status: 400 });
    }

    const pointsToUse = Math.max(0, Math.min(body.usePoints ?? 0, totalPrice));
    const pointError = await processPointPayment(user.id, pointsToUse, plan.name, duration.label);
    if (pointError) return NextResponse.json({ error: pointError }, { status: 400 });

    const cashAmount = totalPrice - pointsToUse;
    const merchantUid = `ad_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    const created = await createSubscriptionWithRefund(
        {
            artistId: artist.id, planId: plan.id, pricePaid: totalPrice,
            paidByPoints: pointsToUse, paidByCash: cashAmount, merchantUid, durationMonths: duration.months,
        },
        user.id, pointsToUse, `${plan.name} ${duration.label} 광고 생성 실패 환불`,
    );
    if ("error" in created) return NextResponse.json({ error: created.error, detail: created.detail }, { status: 500 });

    const response: AdPurchaseResponse = {
        subscriptionId: created.subscription.id,
        merchantUid,
        cashAmount,
        planName: `${plan.name} ${duration.label}`,
    };

    return NextResponse.json(response);
}
