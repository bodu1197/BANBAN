"use server";

import { headers } from "next/headers";
import { incrementPortfolioViews } from "@/lib/supabase/portfolio-view-tracking";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/**
 * 조회수 +1 — **클라이언트가 마운트 후 부른다.**
 *
 * 서버 렌더에서 쓰기를 하면 그 페이지는 캐시할 수 없다(작품 상세 627개가 전부 no-store 였다).
 * 반대로 캐시가 살아나면 서버 렌더 자체가 안 돌아 조회수도 안 오른다 — 캐시와 서버측 조회수는 양립 불가라
 * 집계를 클라이언트로 옮긴다. 실패해도 조용히 무시(조회수는 화면 동작과 무관).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function trackPortfolioView(portfolioId: string): Promise<void> {
  // 서버 액션은 공개 POST 엔드포인트다 — 임의 문자열로 service_role RPC 를 때리지 못하게 형식부터 막고,
  // IP 단위로 제한한다. (조회수는 관리자 화면 표시용일 뿐 랭킹·정산에 쓰이지 않아 피해는 지표 오염 수준이지만,
  //  인증 없는 service_role 쓰기를 무제한 열어둘 이유가 없다.)
  if (!UUID_RE.test(portfolioId)) return;

  const ip = getClientIp(await headers());
  if (!rateLimit({ key: `portfolio-view:${ip}`, limit: 60, windowMs: 60_000 }).success) return;

  await incrementPortfolioViews(portfolioId).catch(() => {
    /* non-fatal */
  });
}
