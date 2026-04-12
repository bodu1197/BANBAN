import { createStaticClient } from "./server";

/** Minimum number of portfolio media for an artist to be visible */
export const MIN_PORTFOLIO_MEDIA = 5;

/**
 * Fetch artist IDs that have active ad subscriptions.
 * These artists bypass the portfolio_media_count minimum.
 */
export async function fetchAdExemptArtistIds(): Promise<Set<string>> {
  const supabase = createStaticClient();
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ad_subscriptions not in generated types
  const { data } = await (supabase as any)
    .from("ad_subscriptions")
    .select("artist_id")
    .eq("status", "ACTIVE")
    .gt("expires_at", now);

  return new Set((data ?? []).map((r: { artist_id: string }) => r.artist_id));
}
