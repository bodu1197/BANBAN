import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { grantFreeSubscription, listAdminGrants } from "@/lib/supabase/ad-queries";
import { VALID_GRANT_MONTHS_SET, GRANTS_PAGE_SIZE } from "@/lib/supabase/ad-constants";
import { UUID_RE } from "@/lib/validation";
import type { AdSubscriptionStatus } from "@/types/ads";

// AdSubscriptionStatus 와 동기화 필요 — 신규 status 추가 시 여기도 추가
const VALID_STATUS = new Set<AdSubscriptionStatus | "ALL">(["ALL", "ACTIVE", "EXPIRED", "CANCELLED", "PENDING"]);

interface GrantBody {
    artistId: string;
    durationMonths: number;
    portfolioIds?: string[];
}

/** POST 본문 검증 결과 — 에러 응답이거나 정규화된 값 */
type GrantBodyResult =
    | { error: NextResponse }
    | { artistId: string; months: number; validatedPortfolioIds: string[] | undefined };

/** portfolioIds 검증 — 옵션이지만 있으면 모두 UUID 형식이어야 함. 에러면 NextResponse, 정상이면 값 반환 */
function validatePortfolioIds(portfolioIds: string[] | undefined):
    { error: NextResponse } | { value: string[] | undefined } {
    if (portfolioIds === undefined) return { value: undefined };
    if (!Array.isArray(portfolioIds)) {
        return { error: NextResponse.json({ error: "portfolioIds 는 배열" }, { status: 400 }) };
    }
    if (portfolioIds.some((id) => typeof id !== "string" || !UUID_RE.test(id))) {
        return { error: NextResponse.json({ error: "portfolioIds 에 잘못된 UUID 포함" }, { status: 400 }) };
    }
    return { value: portfolioIds };
}

/** POST 본문 전체 검증 — artistId, months, portfolioIds 를 순서대로 검증 */
function validateGrantBody(body: GrantBody): GrantBodyResult {
    const { artistId, durationMonths, portfolioIds } = body;

    if (!artistId || typeof artistId !== "string" || !UUID_RE.test(artistId)) {
        return { error: NextResponse.json({ error: "유효하지 않은 artistId" }, { status: 400 }) };
    }

    const months = Number(durationMonths) || 1;
    if (!VALID_GRANT_MONTHS_SET.has(months)) {
        return { error: NextResponse.json({ error: "기간은 1, 2, 3, 6, 12개월 중 선택" }, { status: 400 }) };
    }

    const portfolios = validatePortfolioIds(portfolioIds);
    if ("error" in portfolios) return { error: portfolios.error };

    return { artistId, months, validatedPortfolioIds: portfolios.value };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json() as GrantBody;
    const validated = validateGrantBody(body);
    if ("error" in validated) return validated.error;
    const { artistId, months, validatedPortfolioIds } = validated;

    try {
        const subscription = await grantFreeSubscription(auth.supabase, artistId, months, validatedPortfolioIds);
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

interface GrantListQuery {
    page: number;
    pageSize: number;
    status: AdSubscriptionStatus | "ALL";
    search: string | undefined;
    includeStats: boolean;
}

/** GET 쿼리 파싱 — page, pageSize, status, search, includeStats 를 정규화 */
function parseGrantListQuery(url: string): GrantListQuery {
    const { searchParams } = new URL(url);
    return {
        page: Number(searchParams.get("page") ?? "1") || 1,
        pageSize: Number(searchParams.get("pageSize") ?? String(GRANTS_PAGE_SIZE)) || GRANTS_PAGE_SIZE,
        status: (searchParams.get("status") ?? "ALL") as AdSubscriptionStatus | "ALL",
        search: searchParams.get("search") ?? undefined,
        includeStats: searchParams.get("includeStats") === "true",
    };
}

/** GET: 무료 부여 구독 목록 + 통계 (page, pageSize, status, search 쿼리) */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { page, pageSize, status, search, includeStats } = parseGrantListQuery(request.url);

    if (!VALID_STATUS.has(status)) {
        return NextResponse.json({ error: "유효하지 않은 status" }, { status: 400 });
    }

    try {
        const result = await listAdminGrants(auth.supabase, { page, pageSize, status, search, includeStats });
        return NextResponse.json(result);
    } catch (e) {
        const message = e instanceof Error ? e.message : "알 수 없는 오류";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
