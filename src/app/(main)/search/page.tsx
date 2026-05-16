import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { SearchResultsClient } from "@/app/(main)/search/SearchResultsClient";

export function generateMetadata(): Metadata {
  return {
    title: STRINGS.globalSearch.searchResults,
    description: "반언니 검색 결과 — 아티스트, 포트폴리오, 강좌, 백과사전, 커뮤니티에서 원하는 키워드를 검색해보세요.",
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
