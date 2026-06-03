import "server-only";

import type { User, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// SNS provider 의 avatar_url 을 Supabase Storage 의 avatars 버킷에 다운로드 + 저장.
// callback 인증 흐름에서 사용 — 토큰 만료/CDN 변경 무관 영구 저장.

// === 보안 가드 ===

/** 허용 SNS CDN 호스트 — SSRF 방어 (정확한 hostname 매칭, 서브도메인 와일드카드 미지원). */
const ALLOWED_AVATAR_HOSTS: ReadonlySet<string> = new Set([
  "lh3.googleusercontent.com",      // Google primary
  "lh4.googleusercontent.com",
  "lh5.googleusercontent.com",
  "lh6.googleusercontent.com",
  "avatars.googleusercontent.com",  // Google secondary
  "k.kakaocdn.net",                 // Kakao
  "img1.kakaocdn.net",
  "p.kakaocdn.net",
  "phinf.pstatic.net",              // Naver (사용 시)
]);

/**
 * 허용 MIME 타입 — 임의 파일 업로드 차단.
 * const tuple 하나에서 type + Set 모두 derive → 양쪽 1:1 sync 자동 보장
 * (향후 새 MIME 추가 시 ALLOWED_MIME_VALUES 만 수정).
 */
const ALLOWED_MIME_VALUES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
type AllowedMime = typeof ALLOWED_MIME_VALUES[number];
const ALLOWED_MIME_TYPES: ReadonlySet<AllowedMime> = new Set(ALLOWED_MIME_VALUES);

function isAllowedMime(mime: string): mime is AllowedMime {
  // Set<AllowedMime>.has 는 string 인자 거부 — 검증 후 narrowing 위해 cast 불가피
  return (ALLOWED_MIME_TYPES as ReadonlySet<string>).has(mime);
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;  // 5MB
const FETCH_TIMEOUT_MS = 5000;             // 5초

function isAllowedHost(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  return ALLOWED_AVATAR_HOSTS.has(url.hostname);  // O(1) lookup
}

function extFromMime(mime: AllowedMime): string {
  // exhaustiveness: 모든 AllowedMime case 명시 — 향후 union 추가 시 TS 에러로 누락 감지
  switch (mime) {
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    case "image/jpeg": return "jpg";
  }
}

/**
 * user_metadata 에서 avatar_url 추출 + 검증된 URL 반환.
 * 가드: 문자열 존재, URL 파싱 가능, 화이트리스트 호스트(HTTPS).
 * @returns 검증 통과한 URL 또는 null
 */
function resolveAvatarUrl(user: User): URL | null {
  const rawUrl = (user.user_metadata as { avatar_url?: string } | undefined)?.avatar_url;
  if (!rawUrl || typeof rawUrl !== "string") return null;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (!isAllowedHost(url)) {
    // eslint-disable-next-line no-console
    console.warn("[avatar-download] disallowed host:", url.hostname);
    return null;
  }

  return url;
}

/**
 * fetch 응답에서 size/MIME 검증 후 body + mime 반환.
 * @returns 검증 통과한 { body, mime } 또는 null
 */
async function readValidatedAvatar(
  res: Response,
): Promise<{ body: Uint8Array; mime: AllowedMime } | null> {
  if (!res.ok) return null;

  // Content-Length 사전 검증 (전체 다운로드 전에 크기 차단)
  const contentLength = Number(res.headers.get("content-length") ?? "0");
  if (contentLength > MAX_AVATAR_BYTES) {
    // eslint-disable-next-line no-console
    console.warn("[avatar-download] too large:", contentLength);
    return null;
  }

  // MIME 검증 — split(";")[0] 으로 charset 등 파라미터 제거
  const rawContentType = res.headers.get("content-type") ?? "";
  const mime = rawContentType.split(";")[0].trim().toLowerCase();
  if (!isAllowedMime(mime)) {
    // eslint-disable-next-line no-console
    console.warn("[avatar-download] disallowed mime:", mime);
    return null;
  }
  // mime 은 이제 AllowedMime literal union 으로 narrowing 됨

  const arrayBuffer = await res.arrayBuffer();
  // Content-Length 헤더 누락된 경우 실제 크기로 재검증
  if (arrayBuffer.byteLength > MAX_AVATAR_BYTES) {
    // eslint-disable-next-line no-console
    console.warn("[avatar-download] body too large:", arrayBuffer.byteLength);
    return null;
  }

  return { body: new Uint8Array(arrayBuffer), mime };
}

/**
 * SNS avatar 다운로드 + Supabase Storage 업로드.
 *
 * 보안 가드:
 *  - HTTPS 강제
 *  - 화이트리스트 호스트만 (SSRF 방어 — localhost/내부 IP 차단)
 *  - 5초 타임아웃 (callback hang 방지)
 *  - Content-Length 5MB 제한 (메모리 DoS 방어)
 *  - MIME 화이트리스트 (image/* 만)
 *  - 실패 시 null 반환 (가입 흐름 무영향)
 *
 * @returns storage path (예: "profiles/uuid.jpg") 또는 null
 */
export async function downloadAndStoreAvatar(
  adminClient: SupabaseClient<Database>,
  user: User,
): Promise<string | null> {
  const url = resolveAvatarUrl(user);
  if (!url) return null;

  try {
    // CRITICAL: redirect: "error" — 화이트리스트 통과 후 redirect 로 우회 방지 (SSRF 방어).
    // SNS 공식 CDN(Google/Kakao/Naver) 은 redirect 사용 안 함 → 영향 없음.
    const res = await fetch(url.href, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "error",
    });

    const validated = await readValidatedAvatar(res);
    if (!validated) return null;
    const { body, mime } = validated;

    const ext = extFromMime(mime);
    const path = `profiles/${user.id}.${ext}`;

    const { error } = await adminClient.storage
      .from("avatars")
      .upload(path, body, { contentType: mime, upsert: true });
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[avatar-download] upload failed:", error.message);
      return null;
    }
    return path;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[avatar-download] failed:", e);
    return null;
  }
}
