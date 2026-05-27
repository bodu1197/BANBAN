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
 * Move ad-artist items to natural-looking positions (0–2).
 * Max 2 per section. Position randomized within boost zone.
 */
export function applyBoostGeneric<T>(
  items: T[],
  boostIds: Set<string>,
  getArtistId: (item: T) => string,
  maxBoost = 2,
): T[] {
  if (items.length === 0 || boostIds.size === 0) return items;

  const boosted: T[] = [];
  const rest: T[] = [];

  for (const p of items) {
    if (boostIds.has(getArtistId(p)) && boosted.length < maxBoost) {
      boosted.push(p);
    } else {
      rest.push(p);
    }
  }

  if (boosted.length === 0) return items;

  const result = [...rest];
  for (const item of boosted) {
    const pos = secureRandomInt(Math.min(3, result.length + 1));
    result.splice(pos, 0, item);
  }

  return result;
}

export function applyBoost(
  portfolios: HomePortfolio[],
  boostIds: Set<string>,
  maxBoost = 2,
): HomePortfolio[] {
  return applyBoostGeneric(portfolios, boostIds, (p) => p.artistId, maxBoost);
}

export async function applyBoostToPortfolios(portfolios: HomePortfolio[]): Promise<HomePortfolio[]> {
  const boostIds = await fetchBoostArtistIds();
  return applyBoost(portfolios, new Set(boostIds));
}

export async function applyBoostToRecommendations<T extends { artist_id: string }>(items: T[]): Promise<T[]> {
  const boostIds = await fetchBoostArtistIds();
  return applyBoostGeneric(items, new Set(boostIds), (p) => p.artist_id);
}
