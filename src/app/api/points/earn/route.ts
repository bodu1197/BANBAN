import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { grantWelcomeBonus, earnPointsOnceRef, getArtistType, getPolicyAmount } from "@/lib/supabase/point-queries";
import { DEFAULT_POINT_RULES, getPointAmount, type PointReason } from "@/types/ads";

// 클라이언트가 호출 가능한 reason 은 모두 멱등 처리(반복 호출 시 중복 적립 차단):
//  - WELCOME_BONUS   : 사용자당 1회 (earn_points_once)
//  - PORTFOLIO_UPLOAD: 포트폴리오당 1회 + 소유권 확인 (earn_points_once_ref)
// 그 외 reason(ATTENDANCE/LIKE/REVIEW 등)은 서버 트리거 라우트/액션에서만 발급한다.

/** reason 의 적립 금액 — DB 정책 우선, 없으면 코드 기본값. */
async function computeAmount(userId: string, reason: PointReason): Promise<number> {
    const artistType = await getArtistType(userId);
    const policyAmount = await getPolicyAmount(reason, artistType);
    if (policyAmount !== null) return policyAmount;
    const rule = DEFAULT_POINT_RULES.find(r => r.reason === reason);
    return rule ? getPointAmount(rule, artistType ?? undefined) : 0;
}

/** referenceId(=portfolioId) 가 현재 사용자 소유 포트폴리오인지 확인 — 타 포트폴리오 id 로의 파밍 차단. */
async function ownsPortfolio(portfolioId: string, userId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("portfolios")
        .select("id, artist:artists!inner(user_id)")
        .eq("id", portfolioId)
        .maybeSingle();
    if (!data) return false;
    // PostgREST artists!inner: 1:1 → object, 1:N → array. null 도 명시(데이터 무결성 이슈 fail-closed).
    const artist = (data as unknown as { artist: { user_id: string } | { user_id: string }[] | null }).artist;
    const ownerId = Array.isArray(artist) ? artist[0]?.user_id : artist?.user_id;
    return !!ownerId && ownerId === userId;
}

async function handleWelcomeBonus(userId: string): Promise<NextResponse> {
    const tx = await grantWelcomeBonus(userId);
    return NextResponse.json(tx ? { success: true, transaction: tx } : { success: false, error: "already_granted" });
}

async function handlePortfolioUpload(userId: string, referenceId: string | undefined): Promise<NextResponse> {
    if (!referenceId) return NextResponse.json({ error: "missing_reference" }, { status: 400 });
    if (!(await ownsPortfolio(referenceId, userId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const amount = await computeAmount(userId, "PORTFOLIO_UPLOAD");
    if (amount <= 0) return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
    const tx = await earnPointsOnceRef({
        userId, amount, reason: "PORTFOLIO_UPLOAD", referenceId, description: "포트폴리오 등록",
    });
    return NextResponse.json(tx ? { success: true, transaction: tx } : { success: false, error: "already_granted" });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json() as { reason: PointReason; referenceId?: string };
    if (!body.reason) return NextResponse.json({ error: "missing_reason" }, { status: 400 });
    try {
        if (body.reason === "WELCOME_BONUS") return await handleWelcomeBonus(user.id);
        if (body.reason === "PORTFOLIO_UPLOAD") return await handlePortfolioUpload(user.id, body.referenceId);
        return NextResponse.json({ error: "reason_not_allowed" }, { status: 403 });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "unknown_error";
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
