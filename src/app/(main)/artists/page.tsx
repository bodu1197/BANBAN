import type { Metadata } from "next";
import { renderArtistsPage, generateArtistsMetadata } from "@/lib/pages/artists-page";

// ArtistSearchClient 가 useSearchParams() 로 지역·검색 필터를 읽는다. 이 페이지가 **정적**이면
// 프리렌더 중 바일아웃이 나서 샵 목록이 통째로 사라진다(실측: 본문 509자, 샵 링크 0개).
// 동적 렌더에서는 useSearchParams() 가 정상 SSR 되므로 샵 20개가 HTML 에 실린다.
// 목록 1개를 캐시 못 하는 대신 샵 상세 85개는 정적 프리렌더(●)로 유지된다 — 크롤 예산상 그쪽이 훨씬 크다.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return generateArtistsMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderArtistsPage();
}
