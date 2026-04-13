// @client-reason: Interactive form with state management, file uploads, address search
"use client";
import { STRINGS } from "@/lib/strings";
/* eslint-disable max-lines-per-function, complexity */

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
import type { ArtistFormData, ArtistFormCategory } from "@/types/artist-form";
import {
  useArtistFormHandlers,
  useArtistCategories,
  TypeField,
  TextField,
  TextFieldWithHint,
  AddressField,
  DescriptionField,
  CategoryCheckboxGroup,
  DaumPostcodeModal,
  buildFormLabelsFromDict,
} from "@/components/artist-form/ArtistFormFields";

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
  description: string | null;
  profile_image_path: string | null;
  artist_media: ArtistMedia[];
  region: { id: string; name: string } | null;
}

interface ArtistEditClientProps {
  artist: ArtistData;
  categoryIds: string[];
  categories: ArtistFormCategory[];
}

export function ArtistEditClient({ artist,
  categoryIds,
  categories,
}: Readonly<ArtistEditClientProps>): React.ReactElement {
  const router = useRouter();
  const { isOpen: isAddressOpen, open: openAddress, close: closeAddress } = useDaumPostcode();

  const [formData, setFormData] = useState<ArtistFormData>(() => {
    const shopIds = categories.filter((c) => c.category_type === "SHOP" && categoryIds.includes(c.id)).map((c) => c.id);
    return {
      type_artist: artist.type_artist,
      title: artist.title,
      contact: artist.contact,
      instagram_url: artist.instagram_url ?? "",
      kakao_url: artist.kakao_url ?? "",
      zipcode: artist.zipcode ?? "",
      address: artist.address,
      address_detail: artist.address_detail ?? "",
      region_id: artist.region_id,
      introduce: artist.introduce,
      description: artist.description ?? "",
      shop_category_ids: shopIds,
      bank_holder: "",
      bank_name: "",
      bank_account: "",
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
  const [newShopImages, setNewShopImages] = useState<File[]>([]);
  const [newProfileImage, setNewProfileImage] = useState<File[]>([]);
  const [deletedMediaIds, setDeletedMediaIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-match region from existing address on load (fixes mismatched region_id)
  useEffect(() => {
    const regionKey = addressToRegionKey(artist.address);
    if (!regionKey) return;
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue
    (supabase.from("regions") as any).select("id, name").eq("name", regionKey).single().then(({ data }: { data: { id: string; name: string } | null }) => {
      if (data && data.id !== artist.region_id) {
        setFormData((prev) => ({ ...prev, region_id: data.id }));
      }
    });
  }, [artist.address, artist.region_id]);

  const t = STRINGS.artistRegister;
  const { handleInputChange, handleCheckboxChange } = useArtistFormHandlers(setFormData);
  const { shopCategories } = useArtistCategories(categories);

  const handleAddressSearch = async (): Promise<void> => {
    const result = await openAddress();
    if (!result) return;
    setFormData((prev) => ({ ...prev, zipcode: result.zonecode, address: result.address }));
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
    if (!formData.title.trim() || !formData.contact.trim() || !formData.address.trim() ||
        !formData.region_id || !formData.introduce.trim() ||
        (existingShopImages.length === 0 && newShopImages.length === 0) ||
        (existingProfileImage.length === 0 && newProfileImage.length === 0)) {
      globalThis.alert(t.required);
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const artistId = artist.id;

      // Geocode only if address changed
      const coords = formData.address !== artist.address ? await geocodeAddress(formData.address) : null;

      const updateData: Record<string, unknown> = {
        type_artist: formData.type_artist, title: formData.title,
        contact: formData.contact, instagram_url: formData.instagram_url || null,
        kakao_url: formData.kakao_url || null, zipcode: formData.zipcode,
        address: formData.address,
        address_detail: formData.address_detail || null, region_id: formData.region_id,
        introduce: formData.introduce, description: formData.description || null,
      };
      if (coords) { updateData.lat = coords.lat; updateData.lon = coords.lon; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue
      const { error: artistError } = await (supabase.from("artists") as any).update(updateData).eq("id", artistId);
      if (artistError) throw artistError;

      // Upload new profile image via server API (bypasses storage RLS)
      if (newProfileImage.length > 0) {
        const profileForm = new globalThis.FormData();
        profileForm.append("file", newProfileImage[0]);
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

      // Delete removed shop images via server API
      if (deletedMediaIds.length > 0) {
        await fetch("/api/artist-media", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artistId, mediaIds: deletedMediaIds }),
        });
      }

      // Upload new shop images via server API (bypasses storage RLS)
      const startIndex = existingShopImages.length;
      for (let i = 0; i < newShopImages.length; i++) {
        const shopForm = new globalThis.FormData();
        // eslint-disable-next-line security/detect-object-injection -- iterating within array bounds
        shopForm.append("file", newShopImages[i]);
        const path = `artists/${artistId}/shop_${startIndex + i}_${Date.now()}.webp`;
        const shopRes = await fetch(`/api/upload?bucket=portfolios&path=${encodeURIComponent(path)}`, { method: "PUT", body: shopForm });
        const shopJson = await shopRes.json() as { success: boolean };
        if (!shopJson.success) throw new Error("이미지 업로드 실패");
        await fetch("/api/artist-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artistId, storagePath: path, type: "image", orderIndex: startIndex + i }),
        });
      }

      // Update categories: delete then insert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue
      await (supabase.from("categorizables") as any).delete().eq("categorizable_type", "artist").eq("categorizable_id", artistId);
      const categorizables = [
        ...formData.shop_category_ids.map((catId) => ({ category_id: catId, categorizable_type: "artist" as const, categorizable_id: artistId })),
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue
      if (categorizables.length > 0) await (supabase.from("categorizables") as any).insert(categorizables);

      globalThis.alert(STRINGS.mypage.saved);
      router.push("/mypage");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Update error:", error);
      globalThis.alert(STRINGS.common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formLabels = buildFormLabelsFromDict(t);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[767px] bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4">
        <Link href={"/mypage"} className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Back">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="ml-2 text-lg font-semibold">{STRINGS.mypage.editArtistProfile}</h1>
      </header>

      <form onSubmit={handleSubmit} className="pb-28">
        <div className="space-y-6 p-4">
          <TypeField formData={formData} setFormData={setFormData} t={formLabels} />
          <TextField label={t.artistName} value={formData.title} onChange={handleInputChange("title")} placeholder={t.artistNamePlaceholder} required />
          <TextField label={t.phone} value={formData.contact} onChange={handleInputChange("contact")} placeholder={t.phonePlaceholder} required type="tel" />
          <TextField label={t.instagramUrl} value={formData.instagram_url} onChange={handleInputChange("instagram_url")} placeholder={t.instagramUrlPlaceholder} type="url" />
          <TextFieldWithHint label={t.kakaoUrl} value={formData.kakao_url} onChange={handleInputChange("kakao_url")} placeholder={t.kakaoUrlPlaceholder} hint={t.kakaoUrlHint} />
          <AddressField formData={formData} onSearch={handleAddressSearch} onChange={handleInputChange} t={formLabels} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t.shopImages} <span className="text-red-500">*</span></label>
              <span className="text-xs text-muted-foreground">{existingShopImages.length + newShopImages.length} / 5</span>
            </div>
            <ImageUpload maxLength={5} label={t.shopImagesHint} onChange={handleShopImagesChange} defaultImages={existingShopImages} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t.profileImage} <span className="text-red-500">*</span></label>
              <span className="text-xs text-muted-foreground">{existingProfileImage.length + newProfileImage.length} / 1</span>
            </div>
            <ImageUpload maxLength={1} label={t.profileImageHint} onChange={handleProfileImageChange} defaultImages={existingProfileImage} />
          </div>

          <TextField label={t.introduce} value={formData.introduce} onChange={handleInputChange("introduce")} placeholder={t.introducePlaceholder} required />
          <DescriptionField value={formData.description} onChange={handleInputChange("description")} t={formLabels} />
          <CategoryCheckboxGroup label={t.shopInfo} categories={shopCategories} selectedIds={formData.shop_category_ids} onToggle={handleCheckboxChange} field="shop_category_ids" />
        </div>
      </form>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-4">
        <div className="mx-auto max-w-[767px]">
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-brand-primary py-6 text-base font-semibold text-white hover:bg-brand-primary-hover focus-visible:bg-brand-primary-hover">
            {isSubmitting ? STRINGS.common.saving : STRINGS.common.save}
          </Button>
        </div>
      </footer>

      <DaumPostcodeModal isOpen={isAddressOpen} onClose={closeAddress} />
    </div>
  );
}
