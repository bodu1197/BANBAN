import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { buildPageSeo } from "@/lib/seo";
import { fetchPopularPortfolios } from "@/lib/supabase/home-queries";
import { PortfolioGrid } from "@/components/shared/PortfolioGrid";

const SEO_DESCRIPTION =
  "전국 반영구 포트폴리오 모음 — 눈썹, 입술, 아이라인, 헤어라인까지 다양한 반영구 작품을 한곳에서 비교하고 가격대별로 찾아보세요. 인증된 아티스트의 실제 시술 결과를 확인하세요.";

export async function generatePortfoliosMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.portfoliosList,
    description: SEO_DESCRIPTION,
    keywords: ["반영구 포트폴리오", "반영구 작품", "눈썹 시술 사진", "입술 반영구", "반영구 가격대"],
    ...buildPageSeo({
      title: STRINGS.pages.portfoliosList,
      description: SEO_DESCRIPTION,
      path: "/portfolios",
    }),
  };
}

export async function renderPortfoliosPage(): Promise<React.ReactElement> {
  const portfolios = await fetchPopularPortfolios({ limit: 50 });

  return (
    <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{STRINGS.pages.portfoliosList}</h1>
      <PortfolioGrid portfolios={portfolios} emptyMessage={STRINGS.common.noData} />
    </main>
  );
}
