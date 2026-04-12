import { createClient } from "./server";
import type { AdDurationOption, AdPlan, AdPortfolioSlot, AdSubscription, AdSubscriptionStatus, ActiveAdArtist } from "@/types/ads";

const STATUS_ACTIVE: AdSubscriptionStatus = "ACTIVE";
const SELECT_WITH_PLAN = "*, plan:ad_plans(*)";

// ─── Plans ───────────────────────────────────────────────

/** Get all active ad plans, optionally filtered by artist type */
export async function getAdPlans(artistType?: "TATTOO" | "SEMI_PERMANENT"): Promise<AdPlan[]> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
        .from("ad_plans")
        .select("*")
        .eq("is_active", true);

    if (artistType) {
        query = query.eq("artist_type", artistType);
    }

    const { data } = await query.order("price", { ascending: true });
    return (data ?? []) as AdPlan[];
}

/** Get all active duration options */
export async function getAdDurationOptions(): Promise<AdDurationOption[]> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("ad_duration_options")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    return (data ?? []) as AdDurationOption[];
}

// ─── Subscriptions ───────────────────────────────────────

/** Create a new ad subscription (PENDING status) */
export async function createAdSubscription(params: {
    artistId: string;
    planId: string;
    pricePaid: number;
    paidByPoints: number;
    paidByCash: number;
    merchantUid: string;
    durationMonths: number;
}): Promise<AdSubscription> {
    const days = params.durationMonths * 30;
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from("ad_subscriptions")
        .insert({
            artist_id: params.artistId,
            plan_id: params.planId,
            price_paid: params.pricePaid,
            paid_by_points: params.paidByPoints,
            paid_by_cash: params.paidByCash,
            merchant_uid: params.merchantUid,
            duration_months: params.durationMonths,
            status: params.paidByCash > 0 ? "PENDING" : STATUS_ACTIVE,
            started_at: params.paidByCash === 0 ? new Date().toISOString() : null,
            expires_at: params.paidByCash === 0 ? getExpiryDate(days) : null,
        })
        .select()
        .single();

    if (error) throw new Error(`Failed to create subscription: ${error.message}`);
    return data as AdSubscription;
}

/** Activate a PENDING subscription after PortOne payment verification */
export async function activateSubscription(
    subscriptionId: string,
    impUid: string,
): Promise<AdSubscription> {
    const supabase = await createClient();
    // Read duration_months from the subscription to calculate expiry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sub } = await (supabase as any)
        .from("ad_subscriptions").select("duration_months").eq("id", subscriptionId).single();
    const months = (sub as { duration_months: number } | null)?.duration_months ?? 1;
    const now = new Date().toISOString();
    const expiresAt = getExpiryDate(months * 30);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from("ad_subscriptions")
        .update({
            status: STATUS_ACTIVE,
            started_at: now,
            expires_at: expiresAt,
            imp_uid: impUid,
        })
        .eq("id", subscriptionId)
        .select()
        .single();

    if (error) throw new Error(`Failed to activate subscription: ${error.message}`);
    return data as AdSubscription;
}

/** Get subscriptions for an artist */
export async function getArtistSubscriptions(artistId: string): Promise<AdSubscription[]> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("ad_subscriptions")
        .select(SELECT_WITH_PLAN)
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });

    return (data ?? []) as AdSubscription[];
}

/** Get the current active subscription for an artist (if any) */
export async function getActiveSubscription(artistId: string): Promise<AdSubscription | null> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("ad_subscriptions")
        .select(SELECT_WITH_PLAN)
        .eq("artist_id", artistId)
        .eq("status", STATUS_ACTIVE)
        .gt("expires_at", now)
        .order("expires_at", { ascending: false })
        .limit(1)
        .single();

    return (data as AdSubscription) ?? null;
}

/** Get ALL active subscriptions for an artist */
export async function getActiveSubscriptions(artistId: string): Promise<AdSubscription[]> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("ad_subscriptions")
        .select(SELECT_WITH_PLAN)
        .eq("artist_id", artistId)
        .eq("status", STATUS_ACTIVE)
        .gt("expires_at", now)
        .order("created_at", { ascending: true });

    return (data ?? []) as AdSubscription[];
}

/** Cancel a subscription */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
        .from("ad_subscriptions")
        .update({ status: "CANCELLED" as AdSubscriptionStatus })
        .eq("id", subscriptionId);
}

// ─── Active Ads (for rendering) ──────────────────────────

/** Get all currently active ad artists (for search/homepage display) */
export async function getActiveAdArtists(): Promise<ActiveAdArtist[]> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("ad_subscriptions")
        .select(`
      id,
      artist_id,
      artist:artists!inner(title, profile_image_path),
      slots:ad_portfolio_slots(portfolio_id)
    `)
        .eq("status", STATUS_ACTIVE)
        .gt("expires_at", now);

    if (!data) return [];

    return (data as { id: string; artist_id: string; artist: { title: string; profile_image_path: string | null }; slots: { portfolio_id: string }[] }[]).map(row => ({
        artist_id: row.artist_id,
        subscription_id: row.id,
        artist_title: row.artist.title,
        profile_image_path: row.artist.profile_image_path,
        portfolio_ids: row.slots.map(s => s.portfolio_id),
    }));
}

// ─── Ad Events ───────────────────────────────────────────

/** Record an ad impression or click */
export async function recordAdEvent(params: {
    subscriptionId: string;
    eventType: "IMPRESSION" | "CLICK";
    placement: string;
    pagePath?: string;
}): Promise<void> {
    const supabase = await createClient();

    // Insert event log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
        .from("ad_events")
        .insert({
            subscription_id: params.subscriptionId,
            event_type: params.eventType,
            placement: params.placement,
            page_path: params.pagePath ?? null,
        });

    // Update counter on subscription
    const field = params.eventType === "CLICK" ? "click_count" : "impression_count";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sub } = await (supabase as any)
        .from("ad_subscriptions")
        .select(field)
        .eq("id", params.subscriptionId)
        .single();

    if (sub) {
        // eslint-disable-next-line security/detect-object-injection -- Safe: known key lookup
        const currentCount = (sub as Record<string, number>)[field] ?? 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
            .from("ad_subscriptions")
            .update({ [field]: currentCount + 1 })
            .eq("id", params.subscriptionId);
    }
}

// ─── Expiration Cron ─────────────────────────────────────

/** Mark expired subscriptions as EXPIRED */
export async function expireOldSubscriptions(): Promise<number> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("ad_subscriptions")
        .select("id")
        .eq("status", STATUS_ACTIVE)
        .lt("expires_at", now);

    if (!data || data.length === 0) return 0;

    const ids = (data as { id: string }[]).map(r => r.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
        .from("ad_subscriptions")
        .update({ status: "EXPIRED" as AdSubscriptionStatus })
        .in("id", ids);

    return ids.length;
}

// ─── Admin Stats ─────────────────────────────────────────

/** Get ad revenue stats for admin dashboard, optionally filtered by artist type */
export async function getAdRevenueStats(artistType?: "TATTOO" | "SEMI_PERMANENT"): Promise<{
    totalRevenue: number;
    activeCount: number;
    totalCount: number;
}> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
        .from("ad_subscriptions")
        .select("price_paid, status, expires_at, plan:ad_plans!inner(artist_type)");

    if (artistType) {
        query = query.eq("plan.artist_type", artistType);
    }

    const { data: allSubs } = await query;

    const subs = (allSubs ?? []) as { price_paid: number; status: string; expires_at: string }[];
    const confirmedSubs = subs.filter(s => s.status === STATUS_ACTIVE || s.status === "EXPIRED");
    const totalRevenue = confirmedSubs.reduce((sum, s) => sum + s.price_paid, 0);
    const activeCount = subs.filter(s => s.status === STATUS_ACTIVE && s.expires_at > now).length;

    return { totalRevenue, activeCount, totalCount: confirmedSubs.length };
}

// ─── Portfolio Slots ────────────────────────────────────

/** Get portfolio slots for a subscription */
export async function getAdPortfolioSlots(subscriptionId: string): Promise<AdPortfolioSlot[]> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("ad_portfolio_slots")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .order("created_at", { ascending: true });

    return (data ?? []) as AdPortfolioSlot[];
}

/** Set portfolio slots for a subscription (replace all) */
export async function setAdPortfolioSlots(
    subscriptionId: string,
    portfolioIds: string[],
): Promise<AdPortfolioSlot[]> {
    const supabase = await createClient();

    // Delete existing slots
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
        .from("ad_portfolio_slots")
        .delete()
        .eq("subscription_id", subscriptionId);

    if (portfolioIds.length === 0) return [];

    // Insert new slots
    const rows = portfolioIds.map(pid => ({
        subscription_id: subscriptionId,
        portfolio_id: pid,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from("ad_portfolio_slots")
        .insert(rows)
        .select();

    if (error) throw new Error(`Failed to set portfolio slots: ${error.message}`);
    return (data ?? []) as AdPortfolioSlot[];
}

// ─── Helpers ─────────────────────────────────────────────

function getExpiryDate(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
}
