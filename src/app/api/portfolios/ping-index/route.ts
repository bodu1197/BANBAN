import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { filterPublicPortfolios } from "@/lib/supabase/portfolio-visibility";
import { notifySearchEnginesAsync } from "@/lib/utils/search-notify";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// 통지 꼬리 최악치(google 토큰≤10s + publish≤10s 순차 = ≤20s, indexnow ≤10s 병렬) 위로 인증/DB 왕복
// 여유. keepalive best-effort 라 상한 초과 시 통지만 유실(사용자 흐름과 무관).
export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 소유권 + 삭제여부 조회. 공개필터 없이(비공개·소프트삭제 행까지) 봐야 소유권 판정과 삭제 감지가 가능.
 * admin(service_role) 사용 이유: RLS 가 가리는 비공개/삭제 행을 읽어야 하기 때문 — 소유권 게이트로 범위 한정.
 * 삭제 배선은 소프트삭제(deleted_at 세팅) 후 핑을 쏘므로, 여기서 deleted_at 로 "삭제 vs 생성/수정"을 구분한다.
 */
async function fetchOwnershipState(
  supabase: SupabaseClient<Database>,
  portfolioId: string,
): Promise<{ ownerId: string; isDeleted: boolean } | null> {
  const { data } = await supabase
    .from("portfolios")
    .select("deleted_at, artist:artists!inner(user_id)")
    .eq("id", portfolioId)
    .maybeSingle();
  if (!data) return null;
  const rel = data.artist as { user_id: string } | { user_id: string }[] | null;
  const ownerId = Array.isArray(rel) ? rel[0]?.user_id : rel?.user_id;
  if (!ownerId) return null;
  return { ownerId, isDeleted: data.deleted_at !== null };
}

/** filterPublicPortfolios(목록·사이트맵과 동일 SSOT) 통과 여부 = 현재 공개 상태. */
async function isPublicPortfolio(supabase: SupabaseClient<Database>, portfolioId: string): Promise<boolean> {
  const { data } = await filterPublicPortfolios(
    supabase.from("portfolios").select("id, artist:artists!inner(id)"),
  )
    .eq("id", portfolioId)
    .maybeSingle();
  return data !== null;
}

/**
 * 핑 종류 판단. 삭제(소프트삭제)면 URL_DELETED. 미삭제면 현재 공개일 때만 URL_UPDATED, 비공개면 no-op.
 * no-op 이유: 대부분(온보딩 중 미승인·price0·미디어<5)은 색인된 적 없어 URL_DELETED 가 공유 색인
 * 쿼터(200/일)만 낭비. 공개→비공개 편집(색인됐던 URL)은 예외지만 상세가 이제 404(filterPublicPortfolios
 * 게이트)라 재크롤 시 자연 디인덱싱되므로, 즉시 URL_DELETED 없이도 정리됨(eventually consistent 트레이드오프).
 */
async function resolvePingType(
  supabase: SupabaseClient<Database>,
  isDeleted: boolean,
  portfolioId: string,
): Promise<"URL_UPDATED" | "URL_DELETED" | null> {
  if (isDeleted) return "URL_DELETED";
  return (await isPublicPortfolio(supabase, portfolioId)) ? "URL_UPDATED" : null;
}

/**
 * 작품 상세 색인 핑 — 작성/수정/삭제 후 클라가 호출(type 없이, 서버가 deleted_at·공개상태로 자동 판단).
 * 게이트: 로그인 + 유저당 분당 레이트리밋 + UUID + 소유권. 삭제·공개전환→색인 반영, 비공개는 no-op.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  // ponytail: 유저당 인메모리 리밋(인스턴스별)이라 공유 Google 색인 쿼터(200/일)의 전역 캡은 아니다.
  // 남용(자기 포폴 반복 핑으로 쿼터 소진) 관측 시 전역 카운터(DB/Redis)로 승격. 인증·bannable 행위라 현재는 수용.
  const { success } = rateLimit({ key: `ping-index:${user.id}`, limit: 10, windowMs: 60_000 });
  if (!success) return rateLimitResponse();

  const body = (await request.json().catch(() => null)) as { portfolioId?: unknown } | null;
  const portfolioId = body?.portfolioId;
  if (typeof portfolioId !== "string" || !UUID_RE.test(portfolioId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createAdminClient();
  const state = await fetchOwnershipState(supabase, portfolioId);
  if (!state || state.ownerId !== user.id) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const type = await resolvePingType(supabase, state.isDeleted, portfolioId);
  if (type) await notifySearchEnginesAsync(`/portfolios/${portfolioId}`, type);

  return NextResponse.json({ ok: true, type });
}
