// @client-reason: 위저드 2단계 — 대표 배너 + 샵 대표 사진 업로드(브라우저 File API)
"use client";

import { ImageUpload } from "@/components/ui/image-upload";
import { ShopBannerPicker } from "@/components/artist-form/ShopBannerPicker";
import type { STRINGS } from "@/lib/strings";

export function ImagesStep({
  shopName, t, bannerCount, profileCount, onBannerChange, onProfileChange,
}: Readonly<{
  shopName: string;
  t: typeof STRINGS.artistRegister;
  bannerCount: number;
  profileCount: number;
  onBannerChange: (file: File | null) => void;
  onProfileChange: (files: File[]) => void;
}>): React.ReactElement {
  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">대표 배너 <span className="text-red-500">*</span></label>
          <span className="text-xs text-muted-foreground">{bannerCount} / 1</span>
        </div>
        <p className="text-xs text-muted-foreground">샵 상단에 크게 노출되는 대표 이미지 1장 (1020 × 340)</p>
        <ShopBannerPicker shopName={shopName} onChange={onBannerChange} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">{t.profileImage} <span className="text-red-500">*</span></label>
          <span className="text-xs text-muted-foreground">{profileCount} / 1</span>
        </div>
        <ImageUpload maxLength={1} label={t.profileImageHint} onChange={(files) => onProfileChange(files.filter((f): f is File => f instanceof File))} />
      </div>
    </div>
  );
}
