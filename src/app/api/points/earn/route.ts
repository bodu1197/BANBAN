import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { earnPointsWithLimit, getArtistType, getPolicyAmount } from "@/lib/supabase/point-queries";
import { DEFAULT_POINT_RULES, getPointAmount, type PointReason } from "@/types/ads";

// 클라이언트가 직접 호출 가능한 reason 화이트리스트.
// ATTENDANCE/ATTENDANCE_STREAK/SIGNUP_BONUS 등 서버 트리거 reason 은 별도 라우트에서만 발급한다.
const CLIENT_CALLABLE_REASONS = new Set<PointReason>([
    "WELCOME_BONUS",
    "PORTFOLIO_UPLOAD",
]);

export async function POST(request: NextRequest): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json() as { reason: PointReason; referenceId?: string };
    if (!body.reason) return NextResponse.json({ error: "missing_reason" }, { status: 400 });

    if (!CLIENT_CALLABLE_REASONS.has(body.reason)) {
        return NextResponse.json({ error: "reason_not_allowed" }, { status: 403 });
    }

    const rule = DEFAULT_POINT_RULES.find(r => r.reason === body.reason);
    if (!rule) return NextResponse.json({ error: "invalid_reason" }, { status: 400 });

    const artistType = await getArtistType(user.id);
    // DB 정책 우선, 없으면 코드 기본값 사용
    const policyAmount = await getPolicyAmount(body.reason, artistType);
    const amount = policyAmount ?? getPointAmount(rule, artistType ?? undefined);

    try {
        const tx = await earnPointsWithLimit({
            userId: user.id,
            amount,
            reason: body.reason,
            description: rule.label,
            referenceId: body.referenceId,
        });

        if (!tx) return NextResponse.json({ success: false, error: "daily_limit_reached" });
        return NextResponse.json({ success: true, transaction: tx });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "unknown_error";
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
