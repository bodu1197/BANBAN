import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createStaticClient } from "@/lib/supabase/server";
import { filterPublicPortfolios } from "@/lib/supabase/portfolio-listing-queries";
import { notifySearchEnginesAsync } from "@/lib/utils/search-notify";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// 통지 예산(google 10s + indexnow 10s 병렬) + 인증/DB 왕복 위로 여유 — 플랫폼 기본 상한에 잘리면 통지 유실.
export const maxDuration = 20;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 작품 상세 색인 핑 — 클라이언트 작성/수정 후 호출. server action 큐를 피하려 route 로 분리.
 * 게이트: (1) 로그인 필수, (2) 유저당 분당 레이트리밋(구글 색인 쿼터는 전 사이트 공유 — 루프 남용 차단),
 * (3) portfolioId UUID 형식, (4) filterPublicPortfolios 공개 술어 통과
 * (미승인·price 0·미디어<5 등 비공개 포폴은 색인 요청 안 함 → 사이트맵/목록과 동일 집합 유지).
 * 조회는 공개 데이터라 anon(createStaticClient) — 최소권한, RLS 백스톱 유지.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { success } = rateLimit({ key: `ping-index:${user.id}`, limit: 10, windowMs: 60_000 });
  if (!success) return rateLimitResponse();

  const body = (await request.json().catch(() => null)) as { portfolioId?: unknown } | null;
  const portfolioId = body?.portfolioId;
  if (typeof portfolioId !== "string" || !UUID_RE.test(portfolioId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createStaticClient();
  const { data } = await filterPublicPortfolios(
    supabase.from("portfolios").select("id, artist:artists!inner(id)"),
  )
    .eq("id", portfolioId)
    .maybeSingle();

  // 공개 대상일 때만 통지. serverless 응답 후 중단 방지를 위해 await.
  if (data) await notifySearchEnginesAsync(`/portfolios/${portfolioId}`);

  return NextResponse.json({ ok: true, indexed: Boolean(data) });
}
