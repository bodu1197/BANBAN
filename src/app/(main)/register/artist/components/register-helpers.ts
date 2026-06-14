/**
 * 샵 등록 네트워크 시퀀스 — 위저드 2→3 단계 전환 시 호출.
 * artists insert → 프로필/배너 업로드 → 분류 동기화 → role 승격 → 웰컴 포인트.
 * 컴포넌트(ArtistRegisterClient)는 결과만 보고 상태 전이 — 분기 로직을 여기로 격리.
 */

import { createClient } from "@/lib/supabase/client";
import { geocodeAddress } from "@/types/artist-form";
import { normalizeFancyText } from "@/lib/normalize-text";
import type { ArtistFormData } from "@/types/artist-form";

const JSON_HEADERS = { "Content-Type": "application/json" };
const ARTIST_MEDIA_API = "/api/artist-media";
/** 남성 뷰티 샵 분류 id — type_sex 파생용(미선택 시 FEMALE). */
const MALE_ARTIST_CAT = "5c66b31c-8853-4cf5-864f-6bb84ec2c2ae";

async function uploadProfileImage(artistId: string, file: File): Promise<void> {
  const profileForm = new globalThis.FormData();
  profileForm.append("file", file);
  const profilePath = `${artistId}/profile_${Date.now()}.webp`;
  const profileRes = await fetch(`/api/upload?bucket=avatars&path=${encodeURIComponent(profilePath)}`, { method: "PUT", body: profileForm });
  const profileJson = await profileRes.json() as { success: boolean };
  if (!profileJson.success) return;
  await fetch(ARTIST_MEDIA_API, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ artistId, profileImagePath: profilePath }),
  });
  try {
    const { getAvatarUrl } = await import("@/lib/supabase/storage-utils");
    await createClient().auth.updateUser({ data: { avatar_url: getAvatarUrl(profilePath) ?? "" } });
  } catch {
    /* avatar_url 동기화 실패 무시 */
  }
}

async function uploadBannerImage(artistId: string, file: File): Promise<void> {
  const form = new globalThis.FormData();
  form.append("file", file);
  const path = `artists/${artistId}/banner_${Date.now()}.webp`;
  const res = await fetch(`/api/upload?bucket=portfolios&path=${encodeURIComponent(path)}`, { method: "PUT", body: form });
  const json = await res.json() as { success: boolean };
  if (!json.success) return;
  await fetch(ARTIST_MEDIA_API, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ artistId, bannerPath: path }),
  });
}

async function syncArtistCategories(artistId: string, categoryIds: string[]): Promise<void> {
  if (categoryIds.length === 0) return;
  await fetch("/api/artist-register", {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ artistId, categoryIds }),
  });
}

function buildRegisterBody(formData: ArtistFormData, coords: { lat: number; lon: number } | null): string {
  const isMale = formData.shop_category_ids.includes(MALE_ARTIST_CAT);
  const lat = coords?.lat ?? null;
  const lon = coords?.lon ?? null;
  return JSON.stringify({
    type_artist: formData.type_artist,
    type_sex: isMale ? "MALE" : "FEMALE",
    title: normalizeFancyText(formData.title),
    contact: formData.contact,
    instagram_url: formData.instagram_url || null,
    kakao_url: formData.kakao_url || null,
    zipcode: formData.zipcode,
    address: formData.address,
    address_detail: formData.address_detail || null,
    region_id: formData.region_id,
    introduce: normalizeFancyText(formData.introduce),
    introduce_qa: formData.introduce_qa,
    description: formData.description ? normalizeFancyText(formData.description) : null,
    lat,
    lon,
    business_hours: formData.business_hours,
  });
}

export type ShopRegistrationResult =
  | { status: "created"; artistId: string }
  | { status: "exists" }
  | { status: "duplicate_name" }
  | { status: "error" };

/** 409 응답 분류 — duplicate_name(중복 이름) vs exists(이미 등록). */
async function classifyConflict(res: Response): Promise<"duplicate_name" | "exists"> {
  const errBody = await res.json().catch(() => ({})) as { error?: string };
  return errBody.error === "duplicate_name" ? "duplicate_name" : "exists";
}

export async function registerShop(args: Readonly<{
  formData: ArtistFormData;
  bannerFile: File | undefined;
  profileFile: File | undefined;
}>): Promise<ShopRegistrationResult> {
  const { formData, bannerFile, profileFile } = args;
  const coords = await geocodeAddress(formData.address);

  const registerRes = await fetch("/api/artist-register", {
    method: "POST",
    headers: JSON_HEADERS,
    body: buildRegisterBody(formData, coords),
  });
  if (registerRes.status === 409) return { status: await classifyConflict(registerRes) };
  if (!registerRes.ok) return { status: "error" };

  const { artistId } = await registerRes.json() as { artistId: string };

  // 프로필/배너 업로드는 서로 독립(다른 버킷·경로) → 병렬. 분류 동기화도 함께 묶어 등록 후 대기시간 단축.
  await Promise.all([
    profileFile ? uploadProfileImage(artistId, profileFile) : Promise.resolve(),
    bannerFile ? uploadBannerImage(artistId, bannerFile) : Promise.resolve(),
    syncArtistCategories(artistId, formData.shop_category_ids),
  ]);

  // role='artist' 동기화(API 가 이미 설정하지만 실패 대비 멱등 재호출).
  const promoteRes = await fetch("/api/profiles/promote-to-artist", { method: "POST" });
  if (!promoteRes.ok) {
    // eslint-disable-next-line no-console
    console.warn("[ArtistRegister] role promote failed:", await promoteRes.text());
  }

  // 신규 아티스트 웰컴 포인트(best-effort)
  void fetch("/api/points/earn", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ reason: "WELCOME_BONUS" }) });

  return { status: "created", artistId };
}
