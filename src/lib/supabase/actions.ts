"use server";

import { fetchReviewedArtists } from "./home-queries";
import type { ReviewedArtist, ArtistTypeFilter } from "./home-queries";

export async function fetchReviewedArtistsAction(
  categoryId: string | null,
  typeArtist?: ArtistTypeFilter,
): Promise<ReviewedArtist[]> {
  return fetchReviewedArtists({ categoryId, typeArtist, limit: 10 });
}
