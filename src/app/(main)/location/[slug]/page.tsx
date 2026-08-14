/* eslint-disable no-console -- 프리렌더 실패는 빌드 로그가 유일한 탐지 수단이다(조용한 강등 방지) */
import type { Metadata } from "next";
import {
  renderLocationDetailPage,
  generateLocationDetailMetadata,
} from "@/lib/pages/location-detail-page";
import { fetchLocationSeoList } from "@/lib/location-seo/queries";

export const revalidate = 300;

/**
 * 발행된 지역 페이지를 전부 사전 생성한다.
 * 이게 없으면 Next 가 이 라우트를 완전 동적으로 취급해 Cache-Control: no-store 를 내보내고,
 * 크롤러가 방문할 때마다 서버가 DB 를 새로 조회한다(2026-08-14 실측).
 * 크론이 새 지역을 발행하면 dynamicParams 기본값(true)으로 첫 방문 시 생성 후 캐시된다.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const { items } = await fetchLocationSeoList({ limit: 500 });
    return items.map((item) => ({ slug: item.slug }));
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
  return generateLocationDetailMetadata(slug);
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  return renderLocationDetailPage(slug);
}
