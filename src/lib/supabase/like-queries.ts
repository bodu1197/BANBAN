import "server-only";
import { createAdminClient } from "./server";

/**
 * 특정 사용자가 좋아요한 샵 ID 목록.
 *
 * 세션을 이미 확인한 호출부가 `userId` 를 넘긴다 — `fetchLikedArtistIds()` 처럼 함수가 스스로
 * `getUser()` 를 다시 부르면 한 요청에서 Supabase Auth 왕복이 두 번 난다(viewer 상태 조회에서 실측).
 * likes 테이블은 RLS 로 본인 행만 열리지 않으므로 admin 클라이언트 + `user_id` 스코프로 조회한다.
 */
export async function fetchLikedArtistIdsByUser(userId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("likes")
    .select("likeable_id")
    .eq("user_id", userId)
    .eq("likeable_type", "artist");

  return ((data ?? []) as { likeable_id: string }[]).map((row) => row.likeable_id);
}
