// 공부방 접근 권한 판정(순수, fail-closed).
// '실제로 공개(오픈)된 샵' 운영자는 무조건 무제한. 공개 = 공개 가시성 게이트와 동일:
//   approved_at != null AND is_hide=false (테이크다운된 샵은 비공개이므로 잠금).
// (배너+포폴 완성도 조건은 자동공개 도입으로 제거 — 공개됐으면 곧 완성된 샵.)

export type StudyAccess = "unlimited" | "locked";

export interface StudyEntitlement {
  access: StudyAccess;
}

export interface StudyArtistGate {
  /** 공개 승인 시각(approved_at). null=미공개(draft/없음) → 잠금. */
  approvedAt: string | null;
  /** 관리자 테이크다운 여부. true=숨김(비공개) → 잠금. */
  isHide: boolean;
}

/**
 * 공부방 권한 판정(순수). 실제로 공개된(approved + 숨김 아님) 샵이면 무제한, 그 외 잠금.
 * @param artist null=샵 없음 → 잠금.
 */
export function studyEntitlement(artist: Readonly<StudyArtistGate> | null): StudyEntitlement {
  if (!artist) return { access: "locked" };
  const open = artist.approvedAt !== null && !artist.isHide;
  return { access: open ? "unlimited" : "locked" };
}
