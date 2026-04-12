import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { fetchArtistsWithDetails } from "@/lib/supabase/artist-queries";
import { fetchActiveRegions } from "@/lib/supabase/portfolio-search-queries";
import { fetchLikedArtistIds } from "@/lib/actions/likes";
import { ArtistSearchClient } from "@/components/artists/ArtistSearchClient";

export async function generateArtistsMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.artistsList,
    description: STRINGS.pages.artistsListDesc,
    alternates: getAlternates("/artists"),
  };
}

export async function renderArtistsPage(): Promise<React.ReactElement> {
  const [result, regions, likedIds] = await Promise.all([
    fetchArtistsWithDetails({ typeArtist: "TATTOO", limit: 20 }),
    fetchActiveRegions("TATTOO"),
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
