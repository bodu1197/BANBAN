import type { Metadata } from "next";
import { renderPortfoliosPage, generatePortfoliosMetadata } from "@/lib/pages/portfolios-page";
import { normalizePage } from "@/lib/supabase/portfolio-listing-queries";

export const revalidate = 300;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

async function resolvePage(searchParams: PageProps["searchParams"]): Promise<number> {
  const { page } = await searchParams;
  return normalizePage(page);
}

export async function generateMetadata({ searchParams }: Readonly<PageProps>): Promise<Metadata> {
  return generatePortfoliosMetadata(await resolvePage(searchParams));
}

export default async function Page({ searchParams }: Readonly<PageProps>): Promise<React.ReactElement> {
  return renderPortfoliosPage(await resolvePage(searchParams));
}
