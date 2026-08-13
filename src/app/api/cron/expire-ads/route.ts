// 광고 구독 만료 처리 cron (vercel.json crons 가 호출).
// expireOldSubscriptions() 는 오래전부터 있었지만 호출부가 없어 한 번도 실행된 적이 없었다
// (테이블 전체 status='EXPIRED' 0행) → 만료된 부여가 관리자 화면에 계속 '활성' 으로 표시됐다.
import { NextResponse, type NextRequest } from "next/server";
import { cronAuthError } from "@/lib/cron-auth";
import { expireOldSubscriptions } from "@/lib/supabase/ad-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 첫 실행은 한 번도 만료 처리된 적 없는 누적분을 한꺼번에 전이한다 — 기본 10s 로는 모자랄 수 있다
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
    const denied = cronAuthError(request);
    if (denied) return denied;

    try {
        const expired = await expireOldSubscriptions();
        return NextResponse.json({ ok: true, expired });
    } catch (e) {
        const message = e instanceof Error ? e.message : "알 수 없는 오류";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
