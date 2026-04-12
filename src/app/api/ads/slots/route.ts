import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveSubscriptions, getAdPortfolioSlots, setAdPortfolioSlots } from "@/lib/supabase/ad-queries";
import { getStorageUrl } from "@/lib/supabase/storage-utils";

async function getArtistId(): Promise<{ artistId: string; supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never } | null> {
    const user = await getUser();
    if (!user) return null;
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: artist } = await (supabase as any)
        .from("artists").select("id").eq("user_id", user.id).single();
    if (!artist) return null;
    return { artistId: (artist as { id: string }).id, supabase };
}

async function validatePortfolioOwnership(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    artistId: string,
    portfolioIds: string[],
): Promise<string[]> {
    if (portfolioIds.length === 0) return [];
    const { data: valid } = await supabase
        .from("portfolios")
        .select("id")
        .eq("artist_id", artistId)
        .in("id", portfolioIds);
    const validIds = new Set((valid as { id: string }[] ?? []).map(v => v.id));
    return portfolioIds.filter(id => !validIds.has(id));
}

/** GET: 모든 활성 구독의 포트폴리오 슬롯 + 내 포트폴리오 목록 조회 */
export async function GET(): Promise<NextResponse> {
    const ctx = await getArtistId();
    if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const actives = await getActiveSubscriptions(ctx.artistId);
    if (actives.length === 0) return NextResponse.json({ error: "no_active_ad" }, { status: 404 });

    const [slotsPerSub, portfoliosResult] = await Promise.all([
        Promise.all(actives.map(async sub => ({
            subscriptionId: sub.id,
            slots: (await getAdPortfolioSlots(sub.id)).map(s => s.portfolio_id),
        }))),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ctx.supabase as any)
            .from("portfolios")
            .select("id, title, portfolio_media(storage_path, order_index)")
            .eq("artist_id", ctx.artistId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false }),
    ]);

    const portfolios = (portfoliosResult.data ?? []) as {
        id: string; title: string; portfolio_media: { storage_path: string; order_index: number }[];
    }[];

    const mappedPortfolios = portfolios.map(p => {
        const sorted = [...p.portfolio_media].sort((a, b) => a.order_index - b.order_index);
        return { id: p.id, title: p.title, thumbnail: getStorageUrl(sorted[0]?.storage_path ?? null) };
    });

    return NextResponse.json({
        subscriptions: actives.map(sub => {
            const slotData = slotsPerSub.find(s => s.subscriptionId === sub.id);
            return {
                subscriptionId: sub.id,
                planName: sub.plan?.name ?? "",
                planPrice: sub.plan?.price ?? 0,
                maxPortfolios: sub.plan?.max_portfolios ?? 3,
                slots: slotData?.slots ?? [],
            };
        }),
        portfolios: mappedPortfolios,
    });
}

/** PUT: 특정 구독의 포트폴리오 슬롯 지정/변경 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
    const ctx = await getArtistId();
    if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json() as { subscriptionId?: string; portfolioIds?: string[] };
    const { subscriptionId, portfolioIds } = body;
    if (!subscriptionId || !Array.isArray(portfolioIds)) {
        return NextResponse.json({ error: "subscriptionId and portfolioIds required" }, { status: 400 });
    }

    const actives = await getActiveSubscriptions(ctx.artistId);
    const target = actives.find(s => s.id === subscriptionId);
    if (!target) return NextResponse.json({ error: "subscription_not_found" }, { status: 404 });

    const maxPortfolios = target.plan?.max_portfolios ?? 3;
    if (portfolioIds.length > maxPortfolios) {
        return NextResponse.json({ error: "max_exceeded", max: maxPortfolios }, { status: 400 });
    }

    const invalid = await validatePortfolioOwnership(ctx.supabase, ctx.artistId, portfolioIds);
    if (invalid.length > 0) {
        return NextResponse.json({ error: "invalid_portfolios", invalid }, { status: 400 });
    }

    const slots = await setAdPortfolioSlots(subscriptionId, portfolioIds);
    return NextResponse.json({ success: true, slots: slots.map(s => s.portfolio_id) });
}
