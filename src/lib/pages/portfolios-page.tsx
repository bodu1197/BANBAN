import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { fetchPopularPortfolios } from "@/lib/supabase/home-queries";
import { PortfolioGrid } from "@/components/shared/PortfolioGrid";

export async function generatePortfoliosMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.portfoliosList,
    description: STRINGS.pages.portfoliosListDesc,
    alternates: getAlternates("/portfolios"),
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
