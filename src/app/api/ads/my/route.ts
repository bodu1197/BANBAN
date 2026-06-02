import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getArtistSubscriptions, getActiveSubscription, getAdEventCounts } from "@/lib/supabase/ad-queries";
import type { AdSubscription } from "@/types/ads";

/** 노출/클릭을 ad_events 집계값으로 덮어쓴다 (레거시 0 고정 컬럼 대신 단일 진실 소스). */
function withEventCounts(
    sub: AdSubscription,
    counts: Map<string, { impressions: number; clicks: number }>,
): AdSubscription {
    const c = counts.get(sub.id);
    return { ...sub, impression_count: c?.impressions ?? 0, click_count: c?.clicks ?? 0 };
}

export async function GET(): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const supabase = await createClient();
    const { data: artist } = await supabase
        .from("artists").select("id, type_artist").eq("user_id", user.id).single();

    if (!artist) return NextResponse.json({ error: "not_artist" }, { status: 403 });

    const { id: artistId, type_artist: typeArtist } = artist as { id: string; type_artist: string };
    const [subscriptions, active] = await Promise.all([
        getArtistSubscriptions(artistId),
        getActiveSubscription(artistId),
    ]);

    const ids = [...new Set([...subscriptions.map((s) => s.id), ...(active ? [active.id] : [])])];
    const counts = await getAdEventCounts(ids);

    return NextResponse.json({
        subscriptions: subscriptions.map((s) => withEventCounts(s, counts)),
        active: active ? withEventCounts(active, counts) : null,
        typeArtist,
    });
}
