// 공부방 접근 권한 판정(순수, fail-closed). 게이트 결정(LOCKED):
//   승인(approved_at!=null) + 완성도(대표 배너 + 포트폴리오 REQUIRED_PORTFOLIOS개) = 무제한 / 그 외 = 잠금.
// 7일 무료 체험 폐지 — 공부방을 '미끼'로 샵 완성·검수를 강제(미완성/미승인 샵은 잠금).
import { REQUIRED_PORTFOLIOS } from "@/lib/artist-status";

export type StudyAccess = "unlimited" | "locked";

export interface StudyEntitlement {
  access: StudyAccess;
}

export interface StudyArtistGate {
  status: string | null;
  approvedAt: string | null;
  /** 대표 배너 보유 여부(banner_path). */
  hasBanner: boolean;
  /** 비삭제 포트폴리오 개수. */
  portfolioCount: number;
}

/**
 * 공부방 권한 판정(순수).
 * @param artist artists 완성도 게이트(status·approved_at·배너·포폴수). null=샵 없음 → 잠금.
 */
export function studyEntitlement(artist: Readonly<StudyArtistGate> | null): StudyEntitlement {
  if (!artist) return { access: "locked" };
  const complete = artist.hasBanner && artist.portfolioCount >= REQUIRED_PORTFOLIOS;
  if (artist.approvedAt !== null && complete) return { access: "unlimited" };
  return { access: "locked" };
}
