import type { Metadata } from "next";
import { renderArtistDetailPage, generateArtistDetailMetadata } from "@/lib/pages/artist-detail-page";
import { createStaticClient } from "@/lib/supabase/server";

export const revalidate = 120;
// 동적 ID 도 fallback 으로 ISR 처리 — 새 아티스트 등록 시 첫 방문 후 캐시.
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ id: string }>;
}

/** 인기 아티스트 100명 사전 생성 — first-visit latency 단축 + crawler 인덱싱 가속 */
export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  try {
    const supabase = createStaticClient();
    const { data } = await supabase
      .from("artists")
      .select("id")
      .is("deleted_at", null)
      .eq("is_hide", false)
      .eq("status", "active")
      .order("likes_count", { ascending: false })
      .limit(100);
    return (data ?? []).map((row) => ({ id: (row as { id: string }).id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return generateArtistDetailMetadata(id);
}

export default async function Page({ params }: Readonly<PageProps>): Promise<React.ReactElement> {
  const { id } = await params;
  return renderArtistDetailPage(id);
}
