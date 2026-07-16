import type { Metadata } from "next";
import { renderPortfolioDetailPage, generatePortfolioDetailMetadata } from "@/lib/pages/portfolio-detail-page";
import { createStaticClient } from "@/lib/supabase/server";
import { filterPublicPortfolios } from "@/lib/supabase/portfolio-visibility";

export const revalidate = 120;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ id: string }>;
}

/** 인기 포트폴리오 100건 사전 생성 — first-visit latency 단축 + 인덱싱 가속 */
export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  try {
    const supabase = createStaticClient();
    // 상세 공개 게이트(filterPublicPortfolios)와 동일 술어로 프리렌더 — 불일치 시 프리렌더가
    // notFound()→404 로 캐시돼 120s 마다 무의미 재검증되던 문제 차단.
    const { data } = await filterPublicPortfolios(
      supabase.from("portfolios").select("id, artist:artists!inner(id)"),
    )
      .order("likes_count", { ascending: false })
      .limit(100);
    return (data ?? []).map((row) => ({ id: row.id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return generatePortfolioDetailMetadata(id);
}

export default async function Page({ params }: Readonly<PageProps>): Promise<React.ReactElement> {
  const { id } = await params;
  return renderPortfolioDetailPage(id);
}
