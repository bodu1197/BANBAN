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

interface ArtistRegisterClientProps {
  categories: ArtistFormCategory[];
}

export function ArtistRegisterClient({ categories,
}: Readonly<ArtistRegisterClientProps>): React.ReactElement {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { isOpen: isAddressOpen, open: openAddress, close: closeAddress } = useDaumPostcode();

  const [formData, setFormData] = useState<ArtistFormData>(INITIAL_FORM_DATA);
  const [shopImages, setShopImages] = useState<File[]>([]);
  const [profileImage, setProfileImage] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = STRINGS.artistRegister;
  const { handleInputChange, handleCheckboxChange } = useArtistFormHandlers(setFormData);
  const { shopCategories } = useArtistCategories(categories);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      globalThis.location.href = "/login";
    }
  }, [authLoading, user]);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue
      const { data } = await (supabase.from("regions") as any).select("id, name").eq("name", regionKey).single();
      if (data) {
        setFormData((prev) => ({ ...prev, region_id: data.id as string }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }

    // Validation
    if (!formData.title.trim() || !formData.contact.trim() || !formData.address.trim() ||
        !formData.region_id || !formData.introduce.trim() || profileImage.length === 0) {
      globalThis.alert(t.required);
      return;
    }
    if (formData.introduce.trim().length < INTRODUCE_MIN_LENGTH) {
      globalThis.alert(`소개글을 ${String(INTRODUCE_MIN_LENGTH)}자 이상 작성해 주세요. (현재 ${String(formData.introduce.trim().length)}자)`);
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const coords = await geocodeAddress(formData.address);

      // Derive type_sex from selected shop categories
      const MALE_ARTIST_CAT = "5c66b31c-8853-4cf5-864f-6bb84ec2c2ae";
      const isMale = formData.shop_category_ids.includes(MALE_ARTIST_CAT);
      const typeSex = isMale ? "MALE" : "FEMALE";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue
      const { data: artist, error: artistError } = await (supabase.from("artists") as any)
        .insert({
          user_id: (user as { id: string }).id,
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
          description: formData.description ? normalizeFancyText(formData.description) : null,
          lat: coords?.lat ?? null,
          lon: coords?.lon ?? null,
          is_hide: false,
          likes_count: 0,
          views_count: 0,
          approved_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (artistError) throw artistError;
      const artistId = artist?.id as string;

      // Upload profile image via server API (bypasses storage RLS)
      if (profileImage.length > 0) {
        const profileForm = new globalThis.FormData();
        profileForm.append("file", profileImage[0]);
        const profilePath = `${artistId}/profile.webp`;
        const profileRes = await fetch(`/api/upload?bucket=avatars&path=${encodeURIComponent(profilePath)}`, { method: "PUT", body: profileForm });
        const profileJson = await profileRes.json() as { success: boolean };
        if (profileJson.success) {
          await fetch("/api/artist-media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ artistId, profileImagePath: profilePath }),
          });
        }
      }

      // Upload shop images via server API (bypasses storage RLS)
      for (let i = 0; i < shopImages.length; i++) {
        const shopForm = new globalThis.FormData();
        // eslint-disable-next-line security/detect-object-injection -- iterating within array bounds
        shopForm.append("file", shopImages[i]);
        const shopPath = `artists/${artistId}/shop_${i}.webp`;
        const shopRes = await fetch(`/api/upload?bucket=portfolios&path=${encodeURIComponent(shopPath)}`, { method: "PUT", body: shopForm });
        const shopJson = await shopRes.json() as { success: boolean };
        if (shopJson.success) {
          await fetch("/api/artist-media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ artistId, storagePath: shopPath, type: "image", orderIndex: i }),
          });
        }
      }

      // Add categories
      const categorizables = [
        ...formData.shop_category_ids.map((catId) => ({ category_id: catId, categorizable_type: "artist" as const, categorizable_id: artistId })),
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue
      if (categorizables.length > 0) await (supabase.from("categorizables") as any).insert(categorizables);

      // 신규 아티스트 웰컴 포인트
      void fetch("/api/points/earn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "WELCOME_BONUS" }) });

      globalThis.alert(t.submitSuccess);
      router.push("/");
    } catch (error) {
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
    <div className="mx-auto min-h-screen w-full max-w-[767px] bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4">
        <Link href={"/mypage"} className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Back">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="ml-2 text-lg font-semibold">{t.title}</h1>
      </header>

      <form onSubmit={handleSubmit} className="pb-28">
        <div className="space-y-6 p-4">
          <TextField label={t.artistName} value={formData.title} onChange={handleInputChange("title")} placeholder={t.artistNamePlaceholder} required />
          <TextField label={t.phone} value={formData.contact} onChange={handleInputChange("contact")} placeholder={t.phonePlaceholder} required type="tel" />
          <TextField label={t.instagramUrl} value={formData.instagram_url} onChange={handleInputChange("instagram_url")} placeholder={t.instagramUrlPlaceholder} type="url" />
          <TextFieldWithHint label={t.kakaoUrl} value={formData.kakao_url} onChange={handleInputChange("kakao_url")} placeholder={t.kakaoUrlPlaceholder} hint={t.kakaoUrlHint} />
          <AddressField formData={formData} onSearch={handleAddressSearch} onChange={handleInputChange} t={formLabels} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t.shopImages} <span className="text-red-500">*</span></label>
              <span className="text-xs text-muted-foreground">{shopImages.length} / 5</span>
            </div>
            <ImageUpload maxLength={5} label={t.shopImagesHint} onChange={(files) => setShopImages(files.filter((f): f is File => f instanceof File))} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t.profileImage} <span className="text-red-500">*</span></label>
              <span className="text-xs text-muted-foreground">{profileImage.length} / 1</span>
            </div>
            <ImageUpload maxLength={1} label={t.profileImageHint} onChange={(files) => setProfileImage(files.filter((f): f is File => f instanceof File))} />
          </div>

          <GuidedIntroduce
            value={formData.introduce}
            onChange={(v) => setFormData((prev) => ({ ...prev, introduce: v }))}
          />
          <CategoryCheckboxGroup label={t.shopInfo} categories={shopCategories} selectedIds={formData.shop_category_ids} onToggle={handleCheckboxChange} field="shop_category_ids" />
        </div>
      </form>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-4">
        <div className="mx-auto max-w-[767px]">
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-brand-primary py-6 text-base font-semibold text-white hover:bg-brand-primary-hover focus-visible:bg-brand-primary-hover">
            {isSubmitting ? STRINGS.common.loading : t.submit}
          </Button>
        </div>
      </footer>

      <DaumPostcodeModal isOpen={isAddressOpen} onClose={closeAddress} />
    </div>
  );
}
