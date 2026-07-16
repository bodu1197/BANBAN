import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { buildPageSeo, getBreadcrumbJsonLd } from "@/lib/seo";
import { fetchPublicPortfolioPage } from "@/lib/supabase/portfolio-listing-queries";
import { PortfolioGrid } from "@/components/shared/PortfolioGrid";
import { SeoPagination, hrefForPage } from "@/components/shared/SeoPagination";
import { JsonLdScript } from "@/components/seo/JsonLdScript";

const PORTFOLIOS_PATH = "/portfolios";

const SEO_DESCRIPTION =
  "전국 반영구 포트폴리오 모음 — 눈썹, 입술, 아이라인, 헤어라인까지 다양한 반영구 작품을 한곳에서 비교하고 가격대별로 찾아보세요. 인증 아티스트의 실제 시술 결과와 비포/애프터 사진, 가격 정보를 함께 확인할 수 있습니다.";

export async function generatePortfoliosMetadata(page = 1): Promise<Metadata> {
  // page>1 은 자기 자신을 canonical 로(중복 색인 방지) + 제목에 페이지 표기. URL 규칙은 hrefForPage 공유.
  const path = hrefForPage(PORTFOLIOS_PATH, page);
  const title = page > 1 ? `${STRINGS.pages.portfoliosList} (${page}페이지)` : STRINGS.pages.portfoliosList;
  return {
    title,
    description: SEO_DESCRIPTION,
    keywords: ["반영구 포트폴리오", "반영구 작품", "눈썹 시술 사진", "입술 반영구", "반영구 가격대"],
    ...buildPageSeo({
      title,
      description: SEO_DESCRIPTION,
      path,
    }),
  };
}

export async function renderPortfoliosPage(page = 1): Promise<React.ReactElement> {
  const { items, totalPages } = await fetchPublicPortfolioPage(page);
  // 범위 초과 페이지는 색인 대상 아님 + 막다른 빈 화면 — soft-404 대신 404 로 명확화.
  if (page > totalPages) notFound();

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: STRINGS.pages.portfoliosList, path: PORTFOLIOS_PATH },
  ]);

  return (
    <div className="container mx-auto flex flex-1 flex-col px-4 py-6">
      <JsonLdScript jsonLd={breadcrumbJsonLd} />
      <h1 className="mb-6 text-2xl font-bold">{STRINGS.pages.portfoliosList}</h1>
      <PortfolioGrid portfolios={items} emptyMessage={STRINGS.common.noData} />
      <SeoPagination currentPage={page} totalPages={totalPages} basePath={PORTFOLIOS_PATH} />
    </div>
  );
}
