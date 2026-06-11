/**
 * 샵(artists) 상태 SSOT — 클라이언트/서버 양쪽에서 import 가능한 순수 모듈(서버 의존성 없음).
 *
 * 상태 의미:
 * - pending  : 등록 후 관리자 승인 대기 (approved_at NULL, 비공개)
 * - active   : 승인 완료, 정식 공개
 * - rejected : 관리자 반려 (approved_at NULL, 비공개) — 수정 후 재신청 가능
 * - dormant  : 90일 미접속/포폴 0 자동 휴면 (approved_at NOT NULL, 공개 유지·로그인 시 자동 active)
 *
 * 노출 게이트 두 기준(의도된 분리):
 * - "공개 가능"(active+dormant) = approved_at IS NOT NULL → isPublicArtistStatus / 상세·검색·할인·알림
 * - "활성 추천"(active only)    = status==='active'        → 홈 자연 리스트·광고 품질바
 */
export type ArtistStatus = "pending" | "active" | "rejected" | "dormant";

/** CHECK 제약(artists_status_check)과 동일한 허용값 집합 */
export const ARTIST_STATUSES: readonly ArtistStatus[] = ["pending", "active", "rejected", "dormant"];

/**
 * 공개 노출 가능한 상태(승인 완료 = active 또는 dormant). pending/rejected 는 외부 비공개.
 * DB 쿼리에서는 동등하게 `.not("approved_at", "is", null)`(승인 시점에만 approved_at 설정).
 */
export function isPublicArtistStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "dormant";
}
