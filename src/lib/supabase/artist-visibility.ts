import { createStaticClient } from "./server";

// 샵 상태 SSOT 는 순수 모듈(@/lib/artist-status)에 위치. 기존 import 경로 호환 위해 re-export.
export { isPublicArtistStatus, type ArtistStatus } from "@/lib/artist-status";

/** Minimum number of portfolio media for an artist to be visible */
export const MIN_PORTFOLIO_MEDIA = 5;

/**
 * Fetch artist IDs that have active ad subscriptions.
 * These artists bypass the portfolio_media_count minimum.
 */
export async function fetchAdExemptArtistIds(): Promise<Set<string>> {
  const supabase = createStaticClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("ad_subscriptions")
    .select("artist_id")
    .eq("status", "ACTIVE")
    .gt("expires_at", now);

  return new Set((data ?? []).map((r: { artist_id: string }) => r.artist_id));
}
