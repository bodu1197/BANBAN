/* eslint-disable no-console -- 프리렌더 실패는 빌드 로그가 유일한 탐지 수단이다(조용한 강등 방지) */
import type { Metadata } from "next";
import { renderArtistDetailPage, generateArtistDetailMetadata } from "@/lib/pages/artist-detail-page";
import { createStaticClient } from "@/lib/supabase/server";

// 온디맨드 ISR 주기. 120s 는 너무 짧아 크롤러가 올 때마다 사실상 매번 재생성됐다.
// 저장 액션이 무효화하지 못하는 경로가 남아 있어 무한정 늘리지는 않는다 — 재생성 부하 1/5, 최대 지연 10분.
export const revalidate = 600;
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
  } catch (e) {
    // 조용히 0개를 반환하면 프리렌더가 통째로 사라져도 아무도 모른다 — 빌드 로그가 유일한 탐지 수단.
    console.error(`[generateStaticParams] ${import.meta.url} 실패 — 온디맨드로 강등됨:`, e);
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
