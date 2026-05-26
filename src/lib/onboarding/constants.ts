// /onboarding 페이지에서 SNS 신규 가입자가 회원 유형 선택할 때 사용.
// 5분 윈도우: 가입 직후 5분 안에만 선택 가능. 이후 진입 시 자동 redirect.

export const ONBOARDING_WINDOW_MS = 5 * 60 * 1000;

export const ALLOWED_ROLES = ["user", "artist"] as const;
export type Role = typeof ALLOWED_ROLES[number];

export const ROLE_ROUTES: Record<Role, string> = {
  artist: "/mypage",
  user: "/",
};

export function isWithinOnboardingWindow(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() <= ONBOARDING_WINDOW_MS;
}
