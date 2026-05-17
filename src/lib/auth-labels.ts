/** OAuth provider 라벨 SSOT — 가입/로그인/콜백/관리자 페이지에서 공통 사용 */

export type SocialProvider = "NONE" | "GOOGLE" | "KAKAO" | "APPLE";
export type ProviderSlug = "email" | "google" | "kakao" | "apple";

// 라벨은 한 곳에서만 정의 — type/slug 함수는 모두 이 객체에서 derive
const LABEL_BY_TYPE: Readonly<Record<SocialProvider, string>> = {
  NONE: "이메일",
  GOOGLE: "구글",
  KAKAO: "카카오",
  APPLE: "애플",
} as const;

const TYPE_TO_SLUG: Readonly<Record<SocialProvider, ProviderSlug>> = {
  NONE: "email",
  GOOGLE: "google",
  KAKAO: "kakao",
  APPLE: "apple",
} as const;

function normalizeTypeSocial(value: string | null | undefined): SocialProvider {
  const upper = (value ?? "").toUpperCase();
  return upper === "GOOGLE" || upper === "KAKAO" || upper === "APPLE" ? upper : "NONE";
}

/** type_social DB 값을 한국어 라벨로 변환 (예: "GOOGLE" → "구글") */
export function getProviderLabel(typeSocial: string | null | undefined): string {
  return LABEL_BY_TYPE[normalizeTypeSocial(typeSocial)];
}

/** type_social DB 값을 URL slug 로 변환 (예: "GOOGLE" → "google") — redirect 쿼리스트링용 */
export function getProviderSlug(typeSocial: string | null | undefined): ProviderSlug {
  return TYPE_TO_SLUG[normalizeTypeSocial(typeSocial)];
}

/** URL slug 를 한국어 라벨로 변환 (예: "google" → "구글") — 클라이언트에서 URL param 읽을 때
 *  switch 로 명시적 매핑 — slug 가 URL 사용자 입력이므로 동적 인덱싱 (object injection) 회피 */
export function getLabelFromSlug(slug: string | null | undefined): string {
  switch (slug) {
    case "google": return LABEL_BY_TYPE.GOOGLE;
    case "kakao": return LABEL_BY_TYPE.KAKAO;
    case "apple": return LABEL_BY_TYPE.APPLE;
    default: return LABEL_BY_TYPE.NONE;
  }
}
