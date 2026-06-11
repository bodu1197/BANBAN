// 공부방 접근 권한 판정(순수, fail-closed). 게이트 결정(LOCKED):
//   승인(approved_at!=null)=영구 무제한 / pending=7일 체험 / 그 외=잠금.
// '시험 합격' 종료조건 없음(반영구는 국가시험 부재 — 승인 자체가 무제한).
const TRIAL_DAYS = 7; // pending 무료 체험 기간(일)
const DAY_MS = 86_400_000; // 1일 ms (24*60*60*1000)

export type StudyAccess = "unlimited" | "trial" | "locked";

export interface StudyEntitlement {
  access: StudyAccess;
  /** trial 일 때 남은 일수(1~7), 그 외 0. */
  trialDaysLeft: number;
}

export interface StudyArtistGate {
  status: string | null;
  approvedAt: string | null;
}

/**
 * 공부방 권한 판정(순수).
 * @param artist artists 행(status, approved_at). null=샵 없음 → 잠금.
 * @param trialStartedAt pending 체험 시작 epoch ms(미시작 null → 잠금. 최초 접근 시 layout 이 ensureTrialStarted 로 set 후 재평가).
 * @param now 기준 시각 epoch ms.
 */
export function studyEntitlement(
  artist: Readonly<StudyArtistGate> | null,
  trialStartedAt: number | null,
  now: number = Date.now(),
): StudyEntitlement {
  if (!artist) return { access: "locked", trialDaysLeft: 0 };
  if (artist.approvedAt) return { access: "unlimited", trialDaysLeft: 0 };
  if (artist.status === "pending" && trialStartedAt !== null) {
    const remaining = trialStartedAt + TRIAL_DAYS * DAY_MS - now;
    if (remaining > 0) return { access: "trial", trialDaysLeft: Math.ceil(remaining / DAY_MS) };
  }
  return { access: "locked", trialDaysLeft: 0 };
}
