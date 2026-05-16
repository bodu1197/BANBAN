import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { SearchResultsClient } from "@/app/(main)/search/SearchResultsClient";

export function generateMetadata(): Metadata {
  return {
    title: STRINGS.globalSearch.searchResults,
    description: "반언니 검색 결과 — 아티스트, 포트폴리오, 강좌, 백과사전, 커뮤니티 콘텐츠에서 원하는 키워드를 입력해 검색하고 가격·위치·카테고리·평점 기준으로 결과를 빠르게 좁혀 가장 적합한 반영구 정보와 인기 작품을 찾아보세요.",
    robots: { index: false, follow: true },
    alternates: getAlternates("/search"),
  };
}

export default function SearchPage(): React.ReactElement {
  return (
    <main className="mx-auto w-full max-w-[767px] px-4 py-6">
      <SearchResultsClient />
    </main>
  );
}
