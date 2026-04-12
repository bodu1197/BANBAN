"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { earnPointsWithLimit } from "@/lib/supabase/point-queries";

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
  void earnPointsWithLimit({ userId: user.id, amount: 500, reason: "LIKE", description: "좋아요" });

  return { success: true, isLiked: true };
}

/**
 * 현재 사용자가 포트폴리오를 좋아요했는지 확인
 */
export async function isPortfolioLiked(portfolioId: string): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("likeable_type", "portfolio")
    .eq("likeable_id", portfolioId)
    .maybeSingle();

  return !!data;
}
