import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { grantFreeSubscription } from "@/lib/supabase/ad-queries";
import { UUID_RE } from "@/lib/validation";
const VALID_MONTHS = new Set([1, 2, 3, 6, 12]);

interface GrantBody {
    artistId: string;
    durationMonths: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json() as GrantBody;
    const { artistId, durationMonths } = body;

    if (!artistId || typeof artistId !== "string" || !UUID_RE.test(artistId)) {
        return NextResponse.json({ error: "유효하지 않은 artistId" }, { status: 400 });
    }

    const months = Number(durationMonths) || 1;
    if (!VALID_MONTHS.has(months)) {
        return NextResponse.json({ error: "기간은 1, 2, 3, 6, 12개월 중 선택" }, { status: 400 });
    }

    try {
        const subscription = await grantFreeSubscription(auth.supabase, artistId, months);
        return NextResponse.json({
            ok: true,
            subscriptionId: subscription.id,
            durationMonths: months,
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : "알 수 없는 오류";
        const status = message.includes("찾을 수 없") ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
