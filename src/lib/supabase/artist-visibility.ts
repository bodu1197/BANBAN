import { createAdminClient } from "./server";

// 샵 상태 SSOT 는 순수 모듈(@/lib/artist-status)에 위치. 기존 import 경로 호환 위해 re-export.
export { isPublicArtistStatus, type ArtistStatus } from "@/lib/artist-status";

/** Minimum number of portfolio media for an artist to be visible */
export const MIN_PORTFOLIO_MEDIA = 5;

/** 면제 아티스트 ID 상한 — 목록 쿼리 URL 길이 보호 (ad-constants 의 검색 캡과 같은 이유) */
const MAX_AD_EXEMPT_ARTISTS = 200;

/**
 * Fetch artist IDs that have active ad subscriptions.
 * These artists bypass the portfolio_media_count minimum.
 */
export async function fetchAdExemptArtistIds(): Promise<Set<string>> {
  // service_role — ad_subscriptions 에 anon SELECT RLS 정책이 없어 createStaticClient(anon) 로는
  // 항상 0건이 돌아왔다(= 광고 회원 면제가 한 번도 작동하지 않음, 실측 확인).
  // getActiveAdArtists 와 같은 이유·같은 처방이며, service_role 도 cookies 를 안 써 ISR 은 유지된다.
  //
  // try/catch: createAdminClient 는 SUPABASE_SERVICE_ROLE_KEY 가 없으면 throw 한다. 이 함수는
  // 공개 목록(/artists, /api/artists/search)에서 불리므로, 키가 없는 환경에서 페이지가 통째로 500 이
  // 되면 안 된다 — 면제만 조용히 꺼지는 편이 낫다(이전 anon 동작과 동일한 결과).
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // 상한 — 반환 ID 는 목록 쿼리의 `.or(id.in.(...))` 에 그대로 들어간다. 무제한이면 URL 이 길어져
    // 쿼리가 깨지고, 호출부는 에러를 삼켜 공개 목록이 빈 채로 200 이 된다.
    const { data } = await supabase
      .from("ad_subscriptions")
      .select("artist_id")
      .eq("status", "ACTIVE")
      .gt("expires_at", now)
      .limit(MAX_AD_EXEMPT_ARTISTS);

    return new Set((data ?? []).map((r: { artist_id: string }) => r.artist_id));
  } catch {
    return new Set();
  }
}
