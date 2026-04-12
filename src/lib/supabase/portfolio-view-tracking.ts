import { createAdminClient } from "./server";

/**
 * 포트폴리오 조회수 +1 증가 (서버 사이드, fire-and-forget)
 */
export async function incrementPortfolioViews(portfolioId: string): Promise<void> {
  const supabase = createAdminClient();
  await (supabase.rpc as unknown as (fn: string, params: Record<string, string>) => Promise<unknown>)(
    "increment_portfolio_views",
    { portfolio_id_param: portfolioId },
  );
}
