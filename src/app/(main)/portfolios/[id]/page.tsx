/* eslint-disable no-console -- 프리렌더 실패는 빌드 로그가 유일한 탐지 수단이다(조용한 강등 방지) */
import type { Metadata } from "next";
import { renderPortfolioDetailPage, generatePortfolioDetailMetadata } from "@/lib/pages/portfolio-detail-page";
import { createStaticClient } from "@/lib/supabase/server";
import { filterPublicPortfolios } from "@/lib/supabase/portfolio-visibility";

// 온디맨드 ISR 주기. 120s 는 너무 짧아 크롤러가 올 때마다 사실상 매번 재생성됐다.
// 저장 액션이 무효화하지 못하는 경로가 남아 있어 무한정 늘리지는 않는다 — 재생성 부하 1/5, 최대 지연 10분.
export const revalidate = 600;
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
  } catch (e) {
    // 조용히 0개를 반환하면 프리렌더가 통째로 사라져도 아무도 모른다 — 빌드 로그가 유일한 탐지 수단.
    console.error(`[generateStaticParams] ${import.meta.url} 실패 — 온디맨드로 강등됨:`, e);
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
