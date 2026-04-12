import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWallet, spendPoints } from "@/lib/supabase/point-queries";
import { createAdSubscription, getAdPlans, getAdDurationOptions } from "@/lib/supabase/ad-queries";
import type { AdDurationOption, AdPlan, AdPurchaseRequest, AdPurchaseResponse } from "@/types/ads";

function calculateTotalPrice(monthlyPrice: number, months: number, discountPercent: number): number {
    const raw = monthlyPrice * months;
    return Math.round(raw * (100 - discountPercent) / 100);
}

async function getArtist(userId: string): Promise<{ id: string; type_artist: string } | null> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("artists").select("id, type_artist").eq("user_id", userId).single();
    return data as { id: string; type_artist: string } | null;
}

function getExpectedPlanType(typeArtist: string): "TATTOO" | "SEMI_PERMANENT" {
    return typeArtist === "SEMI_PERMANENT" ? "SEMI_PERMANENT" : "TATTOO";
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
    const wallet = await getOrCreateWallet(userId);
    if (wallet.balance < pointsToUse) return "insufficient_points";
    await spendPoints({
        userId,
        amount: pointsToUse,
        reason: "AD_PAYMENT",
        description: `${planName} ${durationLabel} 광고 결제 (포인트)`,
    });
    return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const artist = await getArtist(user.id);
    if (!artist) return NextResponse.json({ error: "not_artist" }, { status: 403 });

    const body = await request.json() as AdPurchaseRequest;
    if (!body.planId) return NextResponse.json({ error: "missing_plan_id" }, { status: 400 });

    const result = await validatePurchase(body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

    const { plan, duration, totalPrice } = result;
    if (plan.artist_type !== getExpectedPlanType(artist.type_artist)) {
        return NextResponse.json({ error: "plan_type_mismatch" }, { status: 400 });
    }

    const pointsToUse = Math.min(body.usePoints ?? 0, totalPrice);
    const pointError = await processPointPayment(user.id, pointsToUse, plan.name, duration.label);
    if (pointError) return NextResponse.json({ error: pointError }, { status: 400 });

    const cashAmount = totalPrice - pointsToUse;
    const merchantUid = `ad_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    const subscription = await createAdSubscription({
        artistId: artist.id,
        planId: plan.id,
        pricePaid: totalPrice,
        paidByPoints: pointsToUse,
        paidByCash: cashAmount,
        merchantUid,
        durationMonths: duration.months,
    });

    const response: AdPurchaseResponse = {
        subscriptionId: subscription.id,
        merchantUid,
        cashAmount,
        planName: `${plan.name} ${duration.label}`,
    };

    return NextResponse.json(response);
}
