// @client-reason: Interactive form with state management, file uploads, address search
"use client";
import { STRINGS } from "@/lib/strings";
/* eslint-disable max-lines-per-function */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useDaumPostcode } from "@/hooks/useDaumPostcode";
import { createClient } from "@/lib/supabase/client";
import { getStorageUrl, getAvatarUrl } from "@/lib/supabase/storage-utils";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import type { ArtistType } from "@/types/database";
import { addressToRegionKey } from "@/lib/regions";
import { geocodeAddress } from "@/types/artist-form";
import { normalizeFancyText } from "@/lib/normalize-text";
import { revalidateArtistPage } from "@/lib/actions/artists";
import type { ArtistFormData, ArtistFormCategory } from "@/types/artist-form";
import {
  useArtistFormHandlers,
  useArtistCategories,
  TextField,
  TextFieldWithHint,
  AddressField,
  CategoryCheckboxGroup,
  DaumPostcodeModal,
  buildFormLabelsFromDict,
} from "@/components/artist-form/ArtistFormFields";
import { GuidedIntroduce, INTRODUCE_MIN_LENGTH } from "@/components/artist-form/GuidedIntroduce";
import { IntroduceSeoPreview } from "@/components/artist-form/IntroduceSeoPreview";
import { ShopBannerPicker } from "@/components/artist-form/ShopBannerPicker";
import { BusinessHoursField } from "@/components/artist-form/BusinessHoursField";
import { parseBusinessHours, parseIntroduceQA } from "@/types/artist-form";
import type { BusinessHoursMap } from "@/types/artist-form";

interface ArtistMedia {
  id: string;
  storage_path: string;
  type: string;
  order_index: number;
}

interface ArtistData {
  id: string;
  type_artist: ArtistType;
  title: string;
  contact: string;
  instagram_url: string | null;
  kakao_url: string | null;
  zipcode: string | null;
  address: string;
  address_detail: string | null;
  region_id: string;
  introduce: string;
  introduce_qa?: unknown;
  description: string | null;
  profile_image_path: string | null;
  banner_path?: string | null;
  business_hours: BusinessHoursMap | null;
  artist_media: ArtistMedia[];
  region: { id: string; name: string } | null;
  status: string;
}

export interface ArtistEditClientProps {
  artist: ArtistData;
  categoryIds: string[];
  categories: ArtistFormCategory[];
  // admin 모드 — 다른 사람의 아티스트 샵 수정. true 면 API 라우팅을 /api/admin/* 으로 전환.
  isAdmin?: boolean;
}

// --- Helper functions ---

function mediaEndpoint(isAdmin: boolean): string {
  return isAdmin ? "/api/admin/artist-media" : "/api/artist-media";
}

async function patchArtistProfileImage(artistId: string, path: string, isAdmin: boolean): Promise<void> {
  if (isAdmin) {
    const res = await fetch(`/api/admin/artists/${artistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_image_path: path }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? "프로필 이미지 저장 실패");
    }
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from("artists").update({ profile_image_path: path }).eq("id", artistId);
  if (error) throw error;
}

async function uploadProfileImage(artistId: string, file: File, isAdmin: boolean): Promise<void> {
  const form = new globalThis.FormData();
  form.append("file", file);
  // 샵 사진 경로 통일 — artistId 기준 + 타임스탬프 (등록/마이페이지와 동일 규칙, cache-busting).
  const path = `${artistId}/profile_${Date.now()}.webp`;
  const res = await fetch(`/api/upload?bucket=avatars&path=${encodeURIComponent(path)}`, { method: "PUT", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "프로필 이미지 업로드 실패");
  }
  const json = await res.json() as { success: boolean };
  if (!json.success) throw new Error("프로필 이미지 업로드 실패");
  await patchArtistProfileImage(artistId, path, isAdmin);
}

async function patchArtistBanner(artistId: string, path: string, isAdmin: boolean): Promise<void> {
  if (isAdmin) {
    const res = await fetch(`/api/admin/artists/${artistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banner_path: path }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? "배너 저장 실패");
    }
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from("artists").update({ banner_path: path }).eq("id", artistId);
  if (error) throw error;
}

async function uploadBannerImage(artistId: string, file: File, isAdmin: boolean): Promise<void> {
  const form = new globalThis.FormData();
  form.append("file", file);
  const path = `artists/${artistId}/banner_${Date.now()}.webp`;
  const res = await fetch(`/api/upload?bucket=portfolios&path=${encodeURIComponent(path)}`, { method: "PUT", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "배너 업로드 실패");
  }
  const json = await res.json() as { success: boolean };
  if (!json.success) throw new Error("배너 업로드 실패");
  await patchArtistBanner(artistId, path, isAdmin);
}

async function deleteArtistMedia(artistId: string, mediaIds: string[], isAdmin: boolean): Promise<void> {
  const res = await fetch(mediaEndpoint(isAdmin), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artistId, mediaIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "갤러리 삭제 실패");
  }
}

async function uploadShopImages(artistId: string, newImages: File[], startIndex: number, isAdmin: boolean): Promise<void> {
  for (let i = 0; i < newImages.length; i++) {
    const shopForm = new globalThis.FormData();
    // eslint-disable-next-line security/detect-object-injection -- iterating within array bounds
    shopForm.append("file", newImages[i]);
    const path = `artists/${artistId}/shop_${startIndex + i}_${Date.now()}.webp`;
    const shopRes = await fetch(`/api/upload?bucket=portfolios&path=${encodeURIComponent(path)}`, { method: "PUT", body: shopForm });
    if (!shopRes.ok) {
      const err = await shopRes.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? "이미지 업로드 실패");
    }
    const shopJson = await shopRes.json() as { success: boolean };
    if (!shopJson.success) throw new Error("이미지 업로드 실패");
    const mediaRes = await fetch(mediaEndpoint(isAdmin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistId, storagePath: path, type: "image", orderIndex: startIndex + i }),
    });
    if (!mediaRes.ok) {
      const err = await mediaRes.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? "갤러리 추가 실패");
    }
  }
}

function hasRequiredFields(formData: ArtistFormData, hasHeroImage: boolean, hasProfileImage: boolean): boolean {
  const requiredTexts = [formData.title, formData.contact, formData.address, formData.introduce];
  return requiredTexts.every((v) => v.trim().length > 0) &&
    Boolean(formData.region_id) && hasHeroImage && hasProfileImage;
}

function validateEditForm(
  formData: ArtistFormData,
  existingShopCount: number,
  newShopCount: number,
  existingProfileCount: number,
  newProfileCount: number,
  hasBanner: boolean,
): string | null {
  // hero 가 비지 않도록 대표배너 또는 갤러리 중 하나는 필요(레거시 갤러리만 있는 샵도 통과).
  const hasHeroImage = hasBanner || existingShopCount + newShopCount > 0;
  if (!hasHeroImage) return "대표 배너 또는 갤러리 사진을 1장 이상 등록해 주세요.";
  if (!hasRequiredFields(formData, hasHeroImage, existingProfileCount + newProfileCount > 0)) {
    return STRINGS.artistRegister.required;
  }
  const introduceLen = formData.introduce.trim().length;
  if (introduceLen < INTRODUCE_MIN_LENGTH) {
    return `소개글을 ${INTRODUCE_MIN_LENGTH}자 이상 작성해주세요. (현재 ${introduceLen}자)`;
  }
  if (!Object.values(formData.business_hours).some(Boolean)) {
    return "영업시간을 최소 1일 이상 설정해 주세요.";
  }
  return null;
}

function buildArtistUpdateData(formData: ArtistFormData, coords: { lat: number; lon: number } | null): Record<string, unknown> {
  const data: Record<string, unknown> = {
    type_artist: formData.type_artist, title: normalizeFancyText(formData.title),
    contact: formData.contact, instagram_url: formData.instagram_url || null,
    kakao_url: formData.kakao_url || null, zipcode: formData.zipcode,
    address: formData.address,
    address_detail: formData.address_detail || null, region_id: formData.region_id,
    introduce: normalizeFancyText(formData.introduce),
    introduce_qa: formData.introduce_qa,
    description: formData.description ? normalizeFancyText(formData.description) : null,
    business_hours: formData.business_hours,
  };
  if (coords) { data.lat = coords.lat; data.lon = coords.lon; }
  return data;
}

async function updateArtistCategoriesSelf(artistId: string, categoryIds: string[]): Promise<void> {
  const supabase = createClient();
  await supabase.from("categorizables").delete().eq("categorizable_type", "artist").eq("categorizable_id", artistId);
  const categorizables = categoryIds.map((catId) => ({
    category_id: catId, categorizable_type: "artist" as const, categorizable_id: artistId,
  }));
  if (categorizables.length > 0) await supabase.from("categorizables").insert(categorizables);
}

/** admin 모드: artists update + categorizables 동기화를 한 admin route 호출로 묶음 (원자성 ↑) */
async function saveArtistUpdatesAdmin(
  artistId: string,
  updateData: Record<string, unknown>,
  shopCategoryIds: string[],
): Promise<void> {
  const res = await fetch(`/api/admin/artists/${artistId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...updateData, shop_category_ids: shopCategoryIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "admin update 실패");
  }
}

async function saveArtistUpdatesSelf(
  artistId: string,
  updateData: Record<string, unknown>,
  shopCategoryIds: string[],
): Promise<void> {
  const supabase = createClient();
  const { error: artistError } = await supabase.from("artists").update(updateData).eq("id", artistId);
  if (artistError) throw artistError;
  await updateArtistCategoriesSelf(artistId, shopCategoryIds);

  // DB 트리거가 profiles.nickname 을 artists.title 로 자동 동기화하지만,
  // Supabase Auth user_metadata 는 별도 저장소이므로 같이 갱신 (다음 로그인 시 일관성).
  const title = typeof updateData.title === "string" ? updateData.title : null;
  if (title && title.trim()) {
    await supabase.auth.updateUser({ data: { nickname: title } }).catch(() => { /* non-fatal */ });
  }
}

async function saveArtistEdits(
  artist: Readonly<{ id: string; address: string; status: string }>,
  formData: ArtistFormData,
  newProfileImage: File[],
  newBannerImage: File[],
  deletedMediaIds: string[],
  newShopImages: File[],
  existingShopCount: number,
  isAdmin: boolean,
): Promise<void> {
  const artistId = artist.id;

  const coords = formData.address !== artist.address ? await geocodeAddress(formData.address) : null;
  const updateData = buildArtistUpdateData(formData, coords);

  // 반려(rejected) 상태에서 본인이 수정 저장 → 재신청(pending). DB 트리거가 24h 쿨다운 강제 +
  // resubmitted_at 자동 기록. (admin 수정은 상태 자동변경 안 함 — 관리자 의도대로 유지)
  if (!isAdmin && artist.status === "rejected") {
    updateData.status = "pending";
  }

  if (isAdmin) {
    await saveArtistUpdatesAdmin(artistId, updateData, formData.shop_category_ids);
  } else {
    await saveArtistUpdatesSelf(artistId, updateData, formData.shop_category_ids);
  }

  if (newProfileImage.length > 0) await uploadProfileImage(artistId, newProfileImage[0], isAdmin);
  if (newBannerImage.length > 0) await uploadBannerImage(artistId, newBannerImage[0], isAdmin);
  if (deletedMediaIds.length > 0) await deleteArtistMedia(artistId, deletedMediaIds, isAdmin);
  if (newShopImages.length > 0) await uploadShopImages(artistId, newShopImages, existingShopCount, isAdmin);
}

export function ArtistEditClient({ artist,
  categoryIds,
  categories,
  isAdmin = false,
}: Readonly<ArtistEditClientProps>): React.ReactElement {
  const router = useRouter();
  // admin 모드: 목록 페이지로 / 본인 모드: 마이페이지로
  const backHref = isAdmin ? "/admin/members" : "/mypage";
  const headerTitle = isAdmin ? "아티스트 샵 수정 (관리자)" : STRINGS.mypage.editArtistProfile;
  const { isOpen: isAddressOpen, open: openAddress, close: closeAddress } = useDaumPostcode();

  const [formData, setFormData] = useState<ArtistFormData>(() => {
    const shopIds = categories.filter((c) => c.category_type === "SHOP" && categoryIds.includes(c.id)).map((c) => c.id);
    return {
      type_artist: "SEMI_PERMANENT",
      title: artist.title,
      contact: artist.contact,
      instagram_url: artist.instagram_url ?? "",
      kakao_url: artist.kakao_url ?? "",
      zipcode: artist.zipcode ?? "",
      address: artist.address,
      address_detail: artist.address_detail ?? "",
      region_id: artist.region_id,
      introduce: artist.introduce,
      introduce_qa: parseIntroduceQA(artist.introduce_qa),
      description: artist.description ?? "",
      shop_category_ids: shopIds,
      bank_holder: "",
      bank_name: "",
      bank_account: "",
      business_hours: parseBusinessHours(artist.business_hours),
    };
  });

  const [existingShopImages, setExistingShopImages] = useState<Array<{ url: string; id: string }>>(() =>
    artist.artist_media
      .filter((m) => m.type === "image")
      .sort((a, b) => a.order_index - b.order_index)
      .map((m) => ({ url: getStorageUrl(m.storage_path) ?? "", id: m.id }))
  );
  const [existingProfileImage, setExistingProfileImage] = useState<Array<{ url: string }>>(() =>
    artist.profile_image_path ? [{ url: getAvatarUrl(artist.profile_image_path) ?? "" }] : []
  );
  const [existingBannerImage] = useState<Array<{ url: string }>>(() =>
    artist.banner_path ? [{ url: getStorageUrl(artist.banner_path) ?? "" }] : []
  );
  const [newBannerImage, setNewBannerImage] = useState<File[]>([]);
  const [newShopImages, setNewShopImages] = useState<File[]>([]);
  const [newProfileImage, setNewProfileImage] = useState<File[]>([]);
  const [deletedMediaIds, setDeletedMediaIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-match region from existing address on load (fixes mismatched region_id)
  // @client-reason: 클라 폼 상태(formData.region_id) 정정용 보정 쿼리 — addressToRegionKey 로 주소에서 파생한 키로 regions 를 조회해 setFormData 로 폼에 주입한다. 동일 로직이 handleAddressSearch(주소검색 인터랙션)에도 존재하며, 이 컴포넌트는 본인/관리자 두 렌더 경로에서 공유되어 props 계약 변경 시 회귀 위험이 있어 클라 페칭 유지.
  useEffect(() => {
    const regionKey = addressToRegionKey(artist.address);
    if (!regionKey) return;
    const supabase = createClient();
    supabase.from("regions").select("id, name").eq("name", regionKey).single().then(({ data }: { data: { id: string; name: string } | null }) => {
      if (data && data.id !== artist.region_id) {
        setFormData((prev) => ({ ...prev, region_id: data.id }));
      }
    });
  }, [artist.address, artist.region_id]);

  const t = STRINGS.artistRegister;
  const { handleInputChange, handleBlurNormalize, handleCheckboxChange } = useArtistFormHandlers(setFormData);
  const { shopCategories } = useArtistCategories(categories);

  const handleAddressSearch = async (): Promise<void> => {
    const result = await openAddress();
    if (!result) return;
    setFormData((prev) => ({ ...prev, zipcode: result.zonecode, address: result.address }));
    // Auto-match region from address
    const regionKey = addressToRegionKey(result.address);
    if (regionKey) {
      const supabase = createClient();
      const { data } = await supabase.from("regions").select("id, name").eq("name", regionKey).single();
      if (data) {
        setFormData((prev) => ({ ...prev, region_id: data.id as string }));
      }
    }
  };

  const handleShopImagesChange = useCallback(
    (files: Array<File | { url: string; id?: string }>) => {
      const existingImgs = files.filter((f): f is { url: string; id?: string } => !(f instanceof File));
      const newFiles = files.filter((f): f is File => f instanceof File);
      const currentExistingIds = existingImgs.map((img) => img.id).filter(Boolean) as string[];
      const removedIds = existingShopImages.filter((img) => !currentExistingIds.includes(img.id)).map((img) => img.id);
      if (removedIds.length > 0) setDeletedMediaIds((prev) => [...prev, ...removedIds]);
      setExistingShopImages(existingImgs as Array<{ url: string; id: string }>);
      setNewShopImages(newFiles);
    },
    [existingShopImages]
  );

  const handleProfileImageChange = useCallback(
    (files: Array<File | { url: string; id?: string }>) => {
      setExistingProfileImage(files.filter((f): f is { url: string } => !(f instanceof File)));
      setNewProfileImage(files.filter((f): f is File => f instanceof File));
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const validationError = validateEditForm(formData, existingShopImages.length, newShopImages.length, existingProfileImage.length, newProfileImage.length, existingBannerImage.length + newBannerImage.length > 0);
    if (validationError) {
      globalThis.alert(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await saveArtistEdits(artist, formData, newProfileImage, newBannerImage, deletedMediaIds, newShopImages, existingShopImages.length, isAdmin);
      // ISR/CDN 캐시 즉시 무효화 — 인기 아티스트는 정적 prerender + revalidate 만으로는 한참 반영 안 됨
      // 실패해도 저장은 이미 성공이므로 silent 처리 (다음 revalidate 시점에 자연스레 갱신)
      await revalidateArtistPage(artist.id).catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error("Artist page cache invalidation failed:", err);
      });
      globalThis.alert(STRINGS.mypage.saved);
      router.push(backHref);
      router.refresh();
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Update error:", error);
      globalThis.alert(STRINGS.common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formLabels = buildFormLabelsFromDict(t);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1024px] bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4">
        <Link href={backHref} className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Back">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="ml-2 text-lg font-semibold">{headerTitle}</h1>
      </header>

      <form onSubmit={handleSubmit} className="pb-28">
        <div className="space-y-6 p-4">
          <TextField label={t.artistName} value={formData.title} onChange={handleInputChange("title")} onBlur={handleBlurNormalize("title")} placeholder={t.artistNamePlaceholder} required />
          <TextField label={t.phone} value={formData.contact} onChange={handleInputChange("contact")} placeholder={t.phonePlaceholder} required type="tel" />
          <TextField label={t.instagramUrl} value={formData.instagram_url} onChange={handleInputChange("instagram_url")} placeholder={t.instagramUrlPlaceholder} type="url" />
          <TextFieldWithHint label={t.kakaoUrl} value={formData.kakao_url} onChange={handleInputChange("kakao_url")} placeholder={t.kakaoUrlPlaceholder} hint={t.kakaoUrlHint} />
          <AddressField formData={formData} onSearch={handleAddressSearch} onChange={handleInputChange} t={formLabels} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">대표 배너 <span className="text-red-500">*</span></label>
              <span className="text-xs text-muted-foreground">{existingBannerImage.length + newBannerImage.length} / 1</span>
            </div>
            <p className="text-xs text-muted-foreground">샵 상단에 크게 노출되는 대표 이미지 1장 (1020 × 340)</p>
            <ShopBannerPicker shopName={formData.title} initialUrl={existingBannerImage[0]?.url} onChange={(file) => setNewBannerImage(file ? [file] : [])} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">샵 갤러리 <span className="text-xs font-normal text-muted-foreground">(선택)</span></label>
              <span className="text-xs text-muted-foreground">{existingShopImages.length + newShopImages.length} / 10</span>
            </div>
            <p className="text-xs text-muted-foreground">인테리어·작업 공간·시술 사진 등 추가 사진 (최대 10장)</p>
            <ImageUpload maxLength={10} label={t.shopImagesHint} onChange={handleShopImagesChange} defaultImages={existingShopImages} cropAspect={3} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t.profileImage} <span className="text-red-500">*</span></label>
              <span className="text-xs text-muted-foreground">{existingProfileImage.length + newProfileImage.length} / 1</span>
            </div>
            <ImageUpload maxLength={1} label={t.profileImageHint} onChange={handleProfileImageChange} defaultImages={existingProfileImage} />
          </div>

          <IntroduceSeoPreview
            shopName={formData.title}
            introduce={formData.introduce}
            region={formData.address}
            imageCount={existingShopImages.length + newShopImages.length + existingProfileImage.length + newProfileImage.length}
          />
          <GuidedIntroduce
            initial={formData.introduce_qa}
            initialText={formData.introduce}
            onChange={(qa, text) => setFormData((prev) => ({ ...prev, introduce_qa: qa, introduce: text }))}
          />
          <BusinessHoursField
            value={formData.business_hours}
            onChange={(hours) => setFormData((prev) => ({ ...prev, business_hours: hours }))}
          />
          <CategoryCheckboxGroup label={t.shopInfo} categories={shopCategories} selectedIds={formData.shop_category_ids} onToggle={handleCheckboxChange} field="shop_category_ids" />
        </div>
      </form>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-4">
        <div className="mx-auto max-w-[1024px]">
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-brand-primary py-6 text-base font-semibold text-white hover:bg-brand-primary-hover focus-visible:bg-brand-primary-hover">
            {isSubmitting ? STRINGS.common.saving : STRINGS.common.save}
          </Button>
        </div>
      </footer>

      <DaumPostcodeModal isOpen={isAddressOpen} onClose={closeAddress} />
    </div>
  );
}
