import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

interface VisitBody {
    path: string;
    user_agent: string;
    referer: string;
    visitor_id: string;
}

const BOT_PATTERN = /bot|spider|crawl|slurp|fetch|monitor|preview|scan/i;
const RATE_LIMIT_PER_MIN = 60; // 분당 60건 — 정상 사용자 SPA 라우트 변경 보호하면서 spam 차단

function extractIp(request: Request): string {
    return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        ?? request.headers.get("x-real-ip")
        ?? "";
}

async function insertVisit(request: Request, body: Readonly<VisitBody>): Promise<{ ok: boolean }> {
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- page_visits 테이블이 generated types 에 미포함
    const { error } = await (supabase as any).from("page_visits").insert({
        path: body.path,
        country: request.headers.get("x-vercel-ip-country") ?? "",
        user_agent: body.user_agent || null,
        referer: body.referer || null,
        ip: extractIp(request),
        visitor_id: body.visitor_id,
    });
    if (error) {
        // 서버 로깅만, 클라이언트엔 DB 스키마/제약 노출 안 함
        // eslint-disable-next-line no-console
        console.error("[analytics/visit] insert failed:", error.message);
        return { ok: false };
    }
    return { ok: true };
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const ip = getClientIp(request);
        const limit = rateLimit({
            key: `analytics-visit:${ip}`,
            limit: RATE_LIMIT_PER_MIN,
            windowMs: 60_000,
        });
        if (!limit.success) return rateLimitResponse();

        const body = await request.json() as VisitBody;

        if (!body.path || !body.visitor_id) {
            return NextResponse.json({ error: "invalid payload" }, { status: 400 });
        }

        // 봇 사전 필터링 — DB 깨끗하게 유지 (통계 SQL은 추가로 필터링)
        if (body.user_agent && BOT_PATTERN.test(body.user_agent)) {
            return NextResponse.json({ ok: true, skipped: "bot" });
        }

        const result = await insertVisit(request, body);
        if (!result.ok) {
            return NextResponse.json({ error: "failed to record visit" }, { status: 500 });
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[analytics/visit] handler error:", e instanceof Error ? e.message : e);
        return NextResponse.json({ error: "failed to record visit" }, { status: 500 });
    }
}
