/**
 * Storage URL utilities for Supabase public buckets
 * These functions are safe to use in both client and server components
 */

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const STORAGE_BUCKET = "portfolios";
const AVATARS_BUCKET = "avatars";

/**
 * Get the public URL for a storage path (portfolios bucket)
 */
export function getStorageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/**
 * Get the public URL for an avatar/profile image (avatars bucket)
 */
export function getAvatarUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${AVATARS_BUCKET}/${path}`;
}

/**
 * Get the public URL for artist media (stored in portfolios bucket under 'artists/' folder)
 * Note: Artist media paths already include 'artists/' prefix, so we use the same bucket as portfolios
 */
export const getArtistMediaUrl = getStorageUrl;

/**
 * 이미지 사이즈 타입
 */
export type ImageSize = "thumb" | "small" | "medium" | "large" | "original";

/**
 * 최적화된 이미지 URL 가져오기
 *
 * @param basePath - 이미지 기본 경로 (예: "folder/uuid" 또는 "folder/uuid/original.webp")
 * @param size - 원하는 사이즈 (thumb, small, medium, large, original)
 * @param bucket - 스토리지 버킷 (기본: portfolios)
 * @returns 최적화된 이미지의 전체 URL
 *
 * @example
 * // 새 구조 (최적화된 이미지)
 * getOptimizedImageUrl("artists/abc123", "medium")
 * // → https://xxx.supabase.co/storage/v1/object/public/portfolios/artists/abc123/medium.webp
 *
 * // 기존 구조 (원본 이미지) - 폴백
 * getOptimizedImageUrl("artists/abc123/image.jpg", "medium")
 * // → https://xxx.supabase.co/storage/v1/object/public/portfolios/artists/abc123/image.jpg
 */
export function getOptimizedImageUrl(
  basePath: string | null,
  size: ImageSize = "medium",
  bucket: string = STORAGE_BUCKET
): string | null {
  if (!basePath) return null;

  // 이미 전체 URL인 경우 그대로 반환
  if (basePath.startsWith("http://") || basePath.startsWith("https://")) {
    return basePath;
  }

  // 기존 이미지 경로인지 확인 (확장자가 있는 경우)
  const hasExtension = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(basePath);

  if (hasExtension) {
    // 기존 구조: 원본 경로 그대로 반환 (폴백)
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${basePath}`;
  }

  // 새 구조: basePath/size.webp
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${basePath}/${size}.webp`;
}

/**
 * 반응형 이미지를 위한 srcSet 생성
 *
 * @param basePath - 이미지 기본 경로
 * @param bucket - 스토리지 버킷
 * @returns srcSet 문자열
 *
 * @example
 * getImageSrcSet("artists/abc123")
 * // → "...thumb.webp 150w, ...small.webp 320w, ...medium.webp 640w, ...large.webp 1280w"
 */
export function getImageSrcSet(
  basePath: string | null,
  bucket: string = STORAGE_BUCKET
): string | null {
  if (!basePath) return null;

  // 기존 이미지인 경우 srcSet 생성 불가
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(basePath)) {
    return null;
  }

  const sizes: Array<{ size: ImageSize; width: number }> = [
    { size: "thumb", width: 150 },
    { size: "small", width: 320 },
    { size: "medium", width: 640 },
    { size: "large", width: 1280 },
  ];

  return sizes
    .map(({ size, width }) => {
      const url = getOptimizedImageUrl(basePath, size, bucket);
      return `${url} ${width}w`;
    })
    .join(", ");
}
