// 공부방 접근 권한 판정(순수, fail-closed).
// 2026-06-15 결정: '오픈(공개)된 샵' 운영자는 무조건 무제한. 공개 = approved_at != null(active/dormant).
// (이전엔 배너+포폴 완성도까지 요구 → 자동공개 도입으로 단순화: 공개됐으면 곧 완성된 샵.)

export type StudyAccess = "unlimited" | "locked";

export interface StudyEntitlement {
  access: StudyAccess;
}

export interface StudyArtistGate {
  /** 공개 승인 시각(approved_at). null=미공개(draft/없음) → 잠금. */
  approvedAt: string | null;
}

/**
 * 공부방 권한 판정(순수). 오픈된(공개된) 샵이면 무제한, 그 외 잠금.
 * @param artist null=샵 없음 → 잠금.
 */
export function studyEntitlement(artist: Readonly<StudyArtistGate> | null): StudyEntitlement {
  if (!artist) return { access: "locked" };
  return { access: artist.approvedAt !== null ? "unlimited" : "locked" };
}
