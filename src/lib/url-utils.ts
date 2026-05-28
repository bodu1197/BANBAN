/**
 * URL & storage path sanitization helpers.
 *
 * Why: link_url 필드는 관리자가 입력하지만 결국 일반 사용자가 클릭하므로,
 * 외부 도메인, `//evil.com`(프로토콜 상대 URL), `javascript:` 같은 경로가
 * 저장되면 Open Redirect/XSS 가 된다. banunni 배너/퀵메뉴는 내부 페이지만
 * 연결한다는 정책상 외부 URL 자체를 차단한다. image_path/icon_path 는
 * Supabase Storage 경로만 받도록 storage path regex 로 검증한다.
 */

// storage 경로 검증은 storage-utils 단일 구현 재사용 (SSOT)
export { sanitizeStoragePath } from "./supabase/storage-utils";

const MAX_INTERNAL_PATH_LENGTH = 2048;

/**
 * 내부 경로만 허용하도록 정규화한다 (외부 URL 일체 거부).
 *
 * - 빈 입력/실패 모두 `/` 로 폴백.
 * - `//...` (프로토콜 상대 URL), `http(s)://`, `javascript:` 등 외부 향
 *   스킴/호스트는 전부 `/` 로 강제.
 * - 길이 상한을 둬서 비정상 입력 차단.
 */
export function sanitizeLinkUrl(input: string | null | undefined): string {
  if (!input) return "/";
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_INTERNAL_PATH_LENGTH) return "/";
  if (!trimmed.startsWith("/")) return "/";
  if (trimmed.startsWith("//")) return "/";
  return trimmed;
}

/**
 * http(s) 절대 URL 인지 검사 (instagram_url, kakao_url 같은 social link 검증용).
 */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
