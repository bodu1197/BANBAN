import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { buildPageSeo } from "@/lib/seo";
import { fetchArtistsWithDetails } from "@/lib/supabase/artist-queries";
import { fetchActiveRegions } from "@/lib/supabase/portfolio-search-queries";
import { fetchLikedArtistIds } from "@/lib/actions/likes";
import { ArtistSearchClient } from "@/components/artists/ArtistSearchClient";

const SEO_DESCRIPTION =
  "전국 반영구 아티스트를 한곳에서 만나보세요. 눈썹·입술·아이라인·헤어라인 전문가의 포트폴리오, 가격, 리뷰, 위치를 한 번에 비교하고 내게 딱 맞는 인증 아티스트를 찾을 수 있습니다.";

export async function generateArtistsMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.artistsList,
    description: SEO_DESCRIPTION,
    keywords: ["반영구 아티스트", "반영구 잘하는 곳", "눈썹 문신", "입술 반영구", "아이라인", "반영구 가격비교"],
    ...buildPageSeo({
      title: STRINGS.pages.artistsList,
      description: SEO_DESCRIPTION,
      path: "/artists",
    }),
  };
}

export async function renderArtistsPage(): Promise<React.ReactElement> {
  const [result, regions, likedIds] = await Promise.all([
    fetchArtistsWithDetails({ typeArtist: "SEMI_PERMANENT", limit: 20 }),
    fetchActiveRegions("SEMI_PERMANENT"),
    fetchLikedArtistIds(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[767px]">
      <ArtistSearchClient
        initialArtists={result.artists}
        initialTotalCount={result.totalCount}
        regions={regions}
        initialLikedIds={likedIds}
      />
    </main>
  );
}
