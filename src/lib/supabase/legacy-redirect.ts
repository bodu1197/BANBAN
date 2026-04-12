import { cache } from "react";
import { createClient } from "./server";

/**
 * Check if a string looks like a legacy numeric ID (not a UUID).
 */
export function isLegacyNumericId(id: string): boolean {
  return /^\d+$/.test(id);
}

/**
 * Look up the UUID for a legacy portfolio numeric ID.
 * Returns null if not found.
 */
export const findPortfolioByLegacyId = cache(async (legacyId: number): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolios")
    .select("id")
    .eq("legacy_id", legacyId)
    .limit(1)
    .single();
  return data?.id ?? null;
});

/**
 * Look up the UUID for a legacy artist numeric ID.
 * Returns null if not found.
 */
export const findArtistByLegacyId = cache(async (legacyId: number): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("id")
    .eq("legacy_id", legacyId)
    .limit(1)
    .single();
  return data?.id ?? null;
});
