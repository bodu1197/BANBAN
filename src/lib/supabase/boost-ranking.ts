import { unstable_cache } from "next/cache";
import { getActiveAdArtists } from "./ad-queries";
import type { HomePortfolio } from "./portfolio-common";
import { secureRandomInt } from "@/lib/random";

/** Cached active ad artist IDs (60s TTL) */
export const fetchBoostArtistIds = unstable_cache(
  async (): Promise<string[]> => {
    const ads = await getActiveAdArtists();
    return ads.map((a) => a.artist_id);
  },
  ["boost-artist-ids"],
  { revalidate: 60, tags: ["ads"] },
);

/**
 * Move ad-artist portfolios to natural-looking positions (0–2).
 * Max 2 per section. Position randomized within boost zone.
 */
export function applyBoost(
  portfolios: HomePortfolio[],
  boostIds: Set<string>,
  maxBoost = 2,
): HomePortfolio[] {
  if (portfolios.length === 0 || boostIds.size === 0) return portfolios;

  const boosted: HomePortfolio[] = [];
  const rest: HomePortfolio[] = [];

  for (const p of portfolios) {
    if (boostIds.has(p.artistId) && boosted.length < maxBoost) {
      boosted.push(p);
    } else {
      rest.push(p);
    }
  }

  if (boosted.length === 0) return portfolios;

  const result = [...rest];
  for (const item of boosted) {
    const pos = secureRandomInt(Math.min(3, result.length + 1));
    result.splice(pos, 0, item);
  }

  return result;
}

export async function applyBoostToPortfolios(portfolios: HomePortfolio[]): Promise<HomePortfolio[]> {
  const boostIds = await fetchBoostArtistIds();
  return applyBoost(portfolios, new Set(boostIds));
}
