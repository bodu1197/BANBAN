/* eslint-disable no-console -- 프리렌더 실패는 빌드 로그가 유일한 탐지 수단이다(조용한 강등 방지) */
import type { Metadata } from "next";
import {
  renderBoardDetailPage,
  generateBoardDetailMetadata,
} from "@/lib/pages/board-detail-page";
import { fetchBoardSlugs } from "@/lib/board/queries";

export const revalidate = 300;

/**
 * 발행된 백과 글을 전부 사전 생성한다 — location/[slug] 와 같은 이유.
 * 없으면 이 라우트가 완전 동적이 되어 Cache-Control: no-store 로 나가고, 크롤러 방문마다 DB 를 때린다.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const rows = await fetchBoardSlugs();
    return rows.map((row) => ({ slug: row.slug }));
  } catch (e) {
    // 조용히 0개를 반환하면 프리렌더가 통째로 사라져도 아무도 모른다 — 빌드 로그가 유일한 탐지 수단.
    console.error(`[generateStaticParams] ${import.meta.url} 실패 — 온디맨드로 강등됨:`, e);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return generateBoardDetailMetadata(slug);
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  return renderBoardDetailPage(slug);
}
