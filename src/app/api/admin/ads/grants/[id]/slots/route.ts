import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { setSlotsAsAdmin } from "@/lib/supabase/ad-queries";
import { UUID_RE } from "@/lib/validation";

interface SlotsBody {
    portfolioIds: string[];
}

/** PUT: 관리자가 회원 슬롯 직접 수정 */
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id: subscriptionId } = await context.params;
    if (!UUID_RE.test(subscriptionId)) {
        return NextResponse.json({ error: "유효하지 않은 subscriptionId" }, { status: 400 });
    }

    const body = await request.json() as SlotsBody;
    if (!Array.isArray(body.portfolioIds)) {
        return NextResponse.json({ error: "portfolioIds 는 배열" }, { status: 400 });
    }
    if (body.portfolioIds.some((id) => typeof id !== "string" || !UUID_RE.test(id))) {
        return NextResponse.json({ error: "portfolioIds 에 잘못된 UUID 포함" }, { status: 400 });
    }

    try {
        const slots = await setSlotsAsAdmin(auth.supabase, subscriptionId, body.portfolioIds);
        return NextResponse.json({ ok: true, slots });
    } catch (e) {
        const message = e instanceof Error ? e.message : "알 수 없는 오류";
        const status = message.includes("찾을 수 없") ? 404 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
