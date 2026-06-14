/**
 * 샵(artists) 상태 SSOT — 클라이언트/서버 양쪽에서 import 가능한 순수 모듈(서버 의존성 없음).
 *
 * 상태 의미:
 * - draft    : 등록 후 작성 중 (approved_at NULL, 비공개) — 배너+포폴10 채우고 '등록 승인 신청'해야 pending
 * - pending  : 검수 신청 완료, 관리자 승인 대기 (approved_at NULL, 비공개)
 * - active   : 승인 완료, 정식 공개
 * - rejected : 관리자 반려 (approved_at NULL, 비공개) — 수정 후 재신청 가능
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
 * 2026-06-15: 10 → 1 로 하향(사용자 결정) — 배너 + 작품 1개면 즉시 공개. '완성도' 기준이라 공부방 해금과 정렬 유지.
 */
export const REQUIRED_PORTFOLIOS = 1;

/**
 * 공개 노출 가능한 상태(승인 완료 = active 또는 dormant). draft/pending/rejected 는 외부 비공개.
 * DB 쿼리에서는 동등하게 `.not("approved_at", "is", null)`(승인 시점에만 approved_at 설정).
 */
export function isPublicArtistStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "dormant";
}
