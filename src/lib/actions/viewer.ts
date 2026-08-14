"use server";

import { getUser } from "@/lib/supabase/auth";
import { fetchLikedArtistIdsByUser } from "@/lib/supabase/like-queries";

export interface ViewerState {
  isLoggedIn: boolean;
  likedArtistIds: string[];
  /**
   * 서버 응답이 도착했는지. 도착 전에는 "좋아요 안 함"으로 그려지므로, 이미 좋아요한 사용자가
   * 그 사이에 하트를 누르면 UI 는 +1 인데 서버는 좋아요를 **해제**해 상태가 영구히 어긋난다.
   * 토글 UI 는 이 값이 true 가 될 때까지 눌리지 않아야 한다.
   */
  loaded: boolean;
}

/**
 * 로그인 여부 + 좋아요한 샵 — **클라이언트가 마운트 후 한 번 부른다.**
 *
 * 서버 렌더에서 이걸 읽으면 쿠키를 건드리게 되어 Next 가 그 페이지를 "요청마다 새로 그리는 페이지"로
 * 강등시킨다. 그러면 샵 목록·샵 상세 86개가 CDN 캐시를 전혀 못 받고 크롤러가 방문할 때마다
 * 서버가 DB 를 새로 조회한다(2026-08-14 실측: Cache-Control private, no-store).
 *
 * 대신 서버는 **로그아웃 상태**를 렌더한다 — 크롤러가 봐야 하는 것도 정확히 그 화면이고,
 * 그 HTML 은 모든 방문자에게 재사용할 수 있다. 개인화는 하이드레이션 직후 이 액션으로 채운다.
 */
export async function fetchViewerState(): Promise<ViewerState> {
  const user = await getUser().catch(() => null);
  if (!user) return { isLoggedIn: false, likedArtistIds: [], loaded: true };
  // 세션은 방금 확인했으므로 user.id 를 넘긴다 — fetchLikedArtistIds() 를 쓰면 getUser 가 한 번 더 돈다.
  return { isLoggedIn: true, likedArtistIds: await fetchLikedArtistIdsByUser(user.id), loaded: true };
}
