"use server";

import { createAdminClient, createStaticClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { earnPointsWithLimit } from "@/lib/supabase/point-queries";
import { filterPublicPortfolios } from "@/lib/supabase/portfolio-visibility";
import { isUuid } from "@/lib/uuid";

export interface TogglePortfolioLikeResult {
  success: boolean;
  isLiked: boolean;
  error?: string;
}

/**
 * 포트폴리오 좋아요 토글
 * - likes 테이블에 레코드 추가/삭제
 * - portfolios.likes_count RPC로 증감
 */
export async function togglePortfolioLike(portfolioId: string): Promise<TogglePortfolioLikeResult> {
  // 공개 POST 엔드포인트다 — 타입은 런타임에 사라지므로 여기서 막는다.
  if (!isUuid(portfolioId)) return { success: false, isLiked: false, error: "invalid" };

  const user = await getUser();
  if (!user) return { success: false, isLiked: false, error: "unauthorized" };

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("likeable_type", "portfolio")
    .eq("likeable_id", portfolioId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("likes").delete().eq("id", (existing as { id: string }).id);
    if (error) return { success: false, isLiked: true, error: error.message };

    await supabase.rpc("decrement_portfolio_likes", { portfolio_id_param: portfolioId });
    return { success: true, isLiked: false };
  }

  const { error } = await supabase.from("likes").insert({
    user_id: user.id,
    likeable_type: "portfolio",
    likeable_id: portfolioId,
  });

  if (error) return { success: false, isLiked: false, error: error.message };

  await supabase.rpc("increment_portfolio_likes", { portfolio_id_param: portfolioId });

  // 좋아요 포인트 (5회/일)
  void earnPointsWithLimit({ userId: user.id, amount: 500, reason: "LIKE", description: "좋아요" })
    .catch(() => { /* best-effort 적립 — 실패해도 좋아요 자체는 성공 처리 */ });

  return { success: true, isLiked: true };
}

export interface PortfolioLikeState {
  isLiked: boolean;
  /** 서버의 현재 좋아요 수. 프리렌더 HTML 의 값은 최대 ISR 주기만큼 낡아 있다. */
  likesCount: number | null;
}

/**
 * 현재 사용자의 좋아요 여부 + 서버의 현재 좋아요 수.
 *
 * 개수까지 같이 돌려주는 이유: 이 페이지는 프리렌더된 HTML 로 서빙되므로 화면의 개수는
 * 프리렌더 시점 값이다. 좋아요 여부만 갱신하고 개수를 그대로 두면, 프리렌더 이후에 좋아요한
 * 사용자가 해제할 때 개수가 실제보다 2 작아진다(N → N-1 인데 실제는 N+1 이었다).
 */
export async function fetchPortfolioLikeState(portfolioId: string): Promise<PortfolioLikeState> {
  if (!isUuid(portfolioId)) return { isLiked: false, likesCount: null };

  // 비로그인 방문자에게는 쿼리를 한 번도 돌리지 않는다. 개수가 어긋나는 건 "프리렌더 이후에
  // 좋아요한 본인이 해제할 때"뿐이라 로그인 사용자에게만 필요하고, 그렇지 않으면 프리렌더로
  // 캐시해 둔 상세 627개가 방문마다 서버액션 + DB 왕복을 도로 물어야 한다.
  const user = await getUser();
  if (!user) return { isLiked: false, likesCount: null };

  // 개수는 **공개 작품만** 센다. service_role 로 술어 없이 읽으면 로그인만 하면 누구나 미승인·숨김·
  // 삭제된 작품의 좋아요 수를 얻고, 값의 유무 자체가 "그 id 가 존재하는가" 오라클이 된다.
  const { data: portfolio } = await filterPublicPortfolios(
    createStaticClient().from("portfolios").select("likes_count, artist:artists!inner(id)"),
  )
    .eq("id", portfolioId)
    .maybeSingle();
  const likesCount = (portfolio as { likes_count: number | null } | null)?.likes_count ?? null;

  const { data } = await createAdminClient()
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("likeable_type", "portfolio")
    .eq("likeable_id", portfolioId)
    .maybeSingle();

  return { isLiked: !!data, likesCount };
}
