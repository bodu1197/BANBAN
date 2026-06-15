/**
 * 샵(artists) 상태 SSOT — 클라이언트/서버 양쪽에서 import 가능한 순수 모듈(서버 의존성 없음).
 *
 * 상태 의미(2026-06 사전승인 폐지 → 자동공개):
 * - draft    : 등록 후 작성 중 (approved_at NULL, 비공개) — 배너+포폴 REQUIRED_PORTFOLIOS개 채우면 publishShop 으로 즉시 active
 * - active   : 공개 완료(자동공개), 정식 노출
 * - rejected : (레거시) 관리자 반려 — 수정 후 재신청 가능
 * - pending  : (레거시) 사전승인 시절 승인 대기 잔존분
 * - dormant  : 90일 미접속/포폴 0 자동 휴면 (approved_at NOT NULL, 공개 유지·로그인 시 자동 active)
 *
 * 노출 게이트 두 기준(의도된 분리):
 * - "공개 가능"(active+dormant) = approved_at IS NOT NULL → isPublicArtistStatus / 상세·검색·할인·알림
 * - "활성 추천"(active only)    = status==='active'        → 홈 자연 리스트·광고 품질바
 */
export type ArtistStatus = "draft" | "pending" | "active" | "rejected" | "dormant";

/** CHECK 제약(artists_status_check)과 동일한 허용값 집합 */
export const ARTIST_STATUSES: readonly ArtistStatus[] = ["draft", "pending", "active", "rejected", "dormant"];

/**
 * 자동공개(및 공부방 무제한) 게이트에 필요한 최소 포트폴리오 수. (server action·client 공용)
 * 2026-06-15: 1 → 5 로 상향(사용자 결정) — 홍보 장소를 제공받으려면 최소한의 성의(작품 5개)가 필요.
 * 공개 목록 노출 기준 MIN_PORTFOLIO_MEDIA(=5, artist-visibility)와 정렬 → '합격 = 목록 노출' 일치.
 */
export const REQUIRED_PORTFOLIOS = 5;

/**
 * 공개 노출 가능한 상태(승인 완료 = active 또는 dormant). draft/pending/rejected 는 외부 비공개.
 * DB 쿼리에서는 동등하게 `.not("approved_at", "is", null)`(승인 시점에만 approved_at 설정).
 */
export function isPublicArtistStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "dormant";
}
