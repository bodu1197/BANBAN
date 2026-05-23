import type { Metadata } from "next";
import { renderPortfolioDetailPage, generatePortfolioDetailMetadata } from "@/lib/pages/portfolio-detail-page";
import { createStaticClient } from "@/lib/supabase/server";

export const revalidate = 120;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ id: string }>;
}

/** 인기 포트폴리오 100건 사전 생성 — first-visit latency 단축 + 인덱싱 가속 */
export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  try {
    const supabase = createStaticClient();
    const { data } = await supabase
      .from("portfolios")
      .select("id")
      .is("deleted_at", null)
      .gt("price", 0)
      .order("likes_count", { ascending: false })
      .limit(100);
    return (data ?? []).map((row) => ({ id: (row as { id: string }).id }));
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
