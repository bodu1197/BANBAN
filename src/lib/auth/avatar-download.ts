import "server-only";

import type { User, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// SNS provider 의 avatar_url 을 Supabase Storage 의 avatars 버킷에 다운로드 + 저장.
// callback 인증 흐름에서 사용 — 토큰 만료/CDN 변경 무관 영구 저장.

// === 보안 가드 ===

/** 허용 SNS CDN 도메인 — SSRF 방어 (임의 URL fetch 차단). 정확한 host 일치 또는 서브도메인 매칭. */
const ALLOWED_AVATAR_HOSTS = [
  "lh3.googleusercontent.com",      // Google primary
  "lh4.googleusercontent.com",
  "lh5.googleusercontent.com",
  "lh6.googleusercontent.com",
  "avatars.googleusercontent.com",  // Google secondary
  "k.kakaocdn.net",                 // Kakao
  "img1.kakaocdn.net",
  "p.kakaocdn.net",
  "phinf.pstatic.net",              // Naver (사용 시)
] as const;

/** 허용 MIME 타입 — 임의 파일 업로드 차단. */
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;  // 5MB
const FETCH_TIMEOUT_MS = 5000;             // 5초

function isAllowedHost(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  return ALLOWED_AVATAR_HOSTS.some((host) => url.hostname === host);
}

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
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

  try {
    const res = await fetch(url.href, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
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
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      // eslint-disable-next-line no-console
      console.warn("[avatar-download] disallowed mime:", mime);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    // Content-Length 헤더 누락된 경우 실제 크기로 재검증
    if (arrayBuffer.byteLength > MAX_AVATAR_BYTES) {
      // eslint-disable-next-line no-console
      console.warn("[avatar-download] body too large:", arrayBuffer.byteLength);
      return null;
    }
    const body = new Uint8Array(arrayBuffer);

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
