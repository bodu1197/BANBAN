import type { Metadata } from "next";
import { Suspense } from "react";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { fetchPopularArtists } from "@/lib/supabase/home-artist-queries";
import { SearchResultsClient } from "@/app/(main)/search/SearchResultsClient";

export const revalidate = 60; // 인기 아티스트는 1분 ISR

export function generateMetadata(): Metadata {
  return {
    title: STRINGS.globalSearch.searchResults,
    description: "반언니 검색 결과 — 아티스트, 포트폴리오, 강좌, 백과사전, 커뮤니티 콘텐츠에서 원하는 키워드를 입력해 검색하고 가격·위치·카테고리·평점 기준으로 결과를 빠르게 좁혀 가장 적합한 반영구 정보와 인기 작품을 찾아보세요.",
    robots: { index: false, follow: true },
    alternates: getAlternates("/search"),
  };
}

export default async function SearchPage(): Promise<React.ReactElement> {
  // q 가 있어도 없어도 인기 아티스트는 진입 모드에서만 표시 — 서버에서 미리 가져와 props 전달
  const popularArtists = await fetchPopularArtists({ limit: 10 });
  return (
    <main className="mx-auto w-full max-w-[1024px] px-4 py-6 md:px-6">
      <Suspense fallback={null}>
        <SearchResultsClient popularArtists={popularArtists} />
      </Suspense>
    </main>
  );
}
