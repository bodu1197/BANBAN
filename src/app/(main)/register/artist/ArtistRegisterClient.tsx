// @client-reason: Interactive form with state management, file uploads, address search
"use client";
import { STRINGS } from "@/lib/strings";
/* eslint-disable max-lines-per-function, complexity */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDaumPostcode } from "@/hooks/useDaumPostcode";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import { ImageUpload } from "@/components/ui/image-upload";
import { INITIAL_FORM_DATA, geocodeAddress } from "@/types/artist-form";
import { addressToRegionKey } from "@/lib/regions";
import { normalizeFancyText } from "@/lib/normalize-text";
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

const JSON_HEADERS = { "Content-Type": "application/json" };
const ARTIST_MEDIA_API = "/api/artist-media";

function validateRegisterForm(formData: ArtistFormData, hasProfile: boolean, hasBanner: boolean, t: { required: string }): string | null {
  if (!hasBanner) return "대표 배너 이미지를 1장 등록해 주세요.";
  if (!formData.title.trim() || !formData.contact.trim() || !formData.address.trim() ||
      !formData.region_id || !formData.introduce.trim() || !hasProfile) {
    return t.required;
  }
  const introduceLen = formData.introduce.trim().length;
  if (introduceLen < INTRODUCE_MIN_LENGTH) {
    return `소개글을 ${String(INTRODUCE_MIN_LENGTH)}자 이상 작성해 주세요. (현재 ${String(introduceLen)}자)`;
  }
  if (!Object.values(formData.business_hours).some(Boolean)) {
    return "영업시간을 최소 1일 이상 설정해 주세요.";
  }
  return null;
}

async function uploadProfileImage(artistId: string, file: File): Promise<void> {
  const profileForm = new globalThis.FormData();
  profileForm.append("file", file);
  // 샵 사진 경로는 artistId 기준 + 타임스탬프로 통일 (등록/마이페이지/샵수정 동일 규칙, admin 수정 컨텍스트도 커버).
  // 매 업로드가 새 URL → 1년 cacheControl + Next 30일 캐시로 인한 stale-cache 회피.
  const profilePath = `${artistId}/profile_${Date.now()}.webp`;
  const profileRes = await fetch(`/api/upload?bucket=avatars&path=${encodeURIComponent(profilePath)}`, { method: "PUT", body: profileForm });
  const profileJson = await profileRes.json() as { success: boolean };
  if (!profileJson.success) return;
  await fetch(ARTIST_MEDIA_API, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ artistId, profileImagePath: profilePath }),
  });
  // 샵 대표 사진을 user_metadata.avatar_url 에도 동기화 — 헤더/마이페이지가 같은 사진 표시 (ProfileClient 와 동일).
  // 등록은 이미 완료된 상태라 동기화 실패는 비핵심으로 무시.
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
  // 대표 배너 1장 — portfolios 버킷 artists/<id>/banner_<ts>.webp (owner-scoped). banner_path 에 저장.
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

async function uploadShopImages(artistId: string, shopImages: File[]): Promise<void> {
  for (let i = 0; i < shopImages.length; i++) {
    const shopForm = new globalThis.FormData();
    // eslint-disable-next-line security/detect-object-injection -- iterating within array bounds
    shopForm.append("file", shopImages[i]);
    // 타임스탬프로 cache-busting (샵수정 ArtistEditClient 와 동일 — 재업로드 시 stale-cache 방지).
    const shopPath = `artists/${artistId}/shop_${i}_${Date.now()}.webp`;
    const shopRes = await fetch(`/api/upload?bucket=portfolios&path=${encodeURIComponent(shopPath)}`, { method: "PUT", body: shopForm });
    const shopJson = await shopRes.json() as { success: boolean };
    if (shopJson.success) {
      await fetch(ARTIST_MEDIA_API, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ artistId, storagePath: shopPath, type: "image", orderIndex: i }),
      });
    }
  }
}

async function syncArtistCategories(artistId: string, categoryIds: string[]): Promise<void> {
  if (categoryIds.length === 0) return;
  await fetch("/api/artist-register", {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ artistId, categoryIds }),
  });
}

interface ArtistRegisterClientProps {
  categories: ArtistFormCategory[];
}

export function ArtistRegisterClient({ categories,
}: Readonly<ArtistRegisterClientProps>): React.ReactElement {
  const router = useRouter();
  const { user, isLoading: authLoading, hasShop } = useAuth();
  const { isOpen: isAddressOpen, open: openAddress, close: closeAddress } = useDaumPostcode();

  const [formData, setFormData] = useState<ArtistFormData>(INITIAL_FORM_DATA);
  const [bannerImage, setBannerImage] = useState<File[]>([]);
  const [shopImages, setShopImages] = useState<File[]>([]);
  const [profileImage, setProfileImage] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = STRINGS.artistRegister;
  const { handleInputChange, handleBlurNormalize, handleCheckboxChange } = useArtistFormHandlers(setFormData);
  const { shopCategories } = useArtistCategories(categories);

  useEffect(() => {
    if (!authLoading && !user) {
      globalThis.location.href = "/login";
      return;
    }
    if (!authLoading && hasShop) {
      globalThis.alert("이미 아티스트로 등록되어 있습니다.");
      router.push("/mypage");
    }
  }, [authLoading, user, hasShop, router]);

  const handleAddressSearch = async (): Promise<void> => {
    const result = await openAddress();
    if (!result) return;
    setFormData((prev) => ({
      ...prev,
      zipcode: result.zonecode,
      address: result.address,
    }));
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

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }

    const validationError = validateRegisterForm(formData, profileImage.length > 0, bannerImage.length > 0, t);
    if (validationError) {
      globalThis.alert(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const coords = await geocodeAddress(formData.address);

      const MALE_ARTIST_CAT = "5c66b31c-8853-4cf5-864f-6bb84ec2c2ae";
      const isMale = formData.shop_category_ids.includes(MALE_ARTIST_CAT);
      const typeSex = isMale ? "MALE" : "FEMALE";

      const registerRes = await fetch("/api/artist-register", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          type_artist: formData.type_artist,
          type_sex: typeSex,
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
          lat: coords?.lat ?? null,
          lon: coords?.lon ?? null,
          business_hours: formData.business_hours,
        }),
      });

      if (registerRes.status === 409) {
        globalThis.alert("이미 아티스트로 등록되어 있습니다.");
        router.push("/mypage");
        return;
      }
      if (!registerRes.ok) throw new Error("Registration failed");

      const { artistId } = await registerRes.json() as { artistId: string };

      // Upload profile image via server API (bypasses storage RLS)
      if (profileImage.length > 0) {
        await uploadProfileImage(artistId, profileImage[0]);
      }

      // 대표 배너(1장) → banner_path
      if (bannerImage.length > 0) {
        await uploadBannerImage(artistId, bannerImage[0]);
      }

      // 샵 갤러리(0~10장) → artist_media
      await uploadShopImages(artistId, shopImages);

      await syncArtistCategories(artistId, formData.shop_category_ids);

      // 일반 회원이 시술사로 전환된 경우 profiles.role='artist' 동기화.
      // RLS 트리거가 클라이언트 직접 변경을 차단하므로 server API 경유.
      // 실패해도 artists 행은 유지 — 다음 로그인 시 promote 재호출 (idempotent).
      const promoteRes = await fetch("/api/profiles/promote-to-artist", { method: "POST" });
      if (!promoteRes.ok) {
        // eslint-disable-next-line no-console
        console.warn("[ArtistRegister] role promote failed:", await promoteRes.text());
      }

      // 신규 아티스트 웰컴 포인트
      void fetch("/api/points/earn", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ reason: "WELCOME_BONUS" }) });

      globalThis.alert(t.submitSuccess);
      router.push("/");
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Registration error:", error);
      globalThis.alert(STRINGS.common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return <FullPageSpinner />;
  }

  const formLabels = buildFormLabelsFromDict(t);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1024px] bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4">
        <Link href={"/mypage"} className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Back">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="ml-2 text-lg font-semibold">{t.title}</h1>
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
              <span className="text-xs text-muted-foreground">{bannerImage.length} / 1</span>
            </div>
            <p className="text-xs text-muted-foreground">샵 상단에 크게 노출되는 대표 이미지 1장 (1020 × 340)</p>
            <ShopBannerPicker shopName={formData.title} onChange={(file) => setBannerImage(file ? [file] : [])} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">샵 갤러리 <span className="text-xs font-normal text-muted-foreground">(선택)</span></label>
              <span className="text-xs text-muted-foreground">{shopImages.length} / 10</span>
            </div>
            <p className="text-xs text-muted-foreground">인테리어·작업 공간·시술 사진 등 추가 사진 (최대 10장)</p>
            <ImageUpload maxLength={10} label={t.shopImagesHint} onChange={(files) => setShopImages(files.filter((f): f is File => f instanceof File))} cropAspect={3} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t.profileImage} <span className="text-red-500">*</span></label>
              <span className="text-xs text-muted-foreground">{profileImage.length} / 1</span>
            </div>
            <ImageUpload maxLength={1} label={t.profileImageHint} onChange={(files) => setProfileImage(files.filter((f): f is File => f instanceof File))} />
          </div>

          <IntroduceSeoPreview
            shopName={formData.title}
            introduce={formData.introduce}
            region={formData.address}
            imageCount={shopImages.length + profileImage.length}
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
            {isSubmitting ? STRINGS.common.loading : t.submit}
          </Button>
        </div>
      </footer>

      <DaumPostcodeModal isOpen={isAddressOpen} onClose={closeAddress} />
    </div>
  );
}
