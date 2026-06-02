import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseAdEventBody, recordAdPortfolioEvents } from "@/lib/supabase/ad-events";

// 광고 클릭 기록. 클라이언트는 클릭된 /portfolios/{id} 를 보내고, 서버가 광고 여부를 판정해 CLICK 이벤트 적재.
// 클릭은 1건씩 비콘 전송되므로 노출(50)보다 작은 상한으로 충분.
const MAX_BATCH = 10;
const EMPTY = new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest): Promise<NextResponse> {
    const parsed = await parseAdEventBody(request, MAX_BATCH);
    if (!parsed) return EMPTY;

    await recordAdPortfolioEvents({
        portfolioIds: parsed.validIds,
        eventType: "CLICK",
        placement: parsed.placement,
        pagePath: parsed.pagePath,
    });
    return EMPTY;
}
