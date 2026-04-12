import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { SearchResultsClient } from "@/app/(main)/search/SearchResultsClient";

export function generateMetadata(): Metadata {
  return {
    title: STRINGS.globalSearch.searchResults,
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
