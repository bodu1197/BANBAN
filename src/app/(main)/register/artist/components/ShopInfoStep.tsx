// @client-reason: 위저드 1단계 — 샵 기본정보 입력(controlled fields, 주소검색 모달)
"use client";

import {
  TextField,
  TextFieldWithHint,
  AddressField,
  CategoryCheckboxGroup,
  type ArtistFormLabels,
} from "@/components/artist-form/ArtistFormFields";
import { GuidedIntroduce } from "@/components/artist-form/GuidedIntroduce";
import { IntroduceSeoPreview } from "@/components/artist-form/IntroduceSeoPreview";
import { BusinessHoursField } from "@/components/artist-form/BusinessHoursField";
import type { STRINGS } from "@/lib/strings";
import type { ArtistFormData, ArtistFormCategory, BusinessHoursMap, IntroduceQA } from "@/types/artist-form";

type ChangeHandler = (field: keyof ArtistFormData) => (e: React.ChangeEvent<HTMLInputElement>) => void;
type BlurHandler = (field: "title" | "introduce" | "description") => () => void;

export function ShopInfoStep({
  formData, t, formLabels, shopCategories,
  handleInputChange, handleBlurNormalize, handleCheckboxChange,
  onAddressSearch, onIntroduceChange, onBusinessHoursChange,
}: Readonly<{
  formData: ArtistFormData;
  t: typeof STRINGS.artistRegister;
  formLabels: ArtistFormLabels;
  shopCategories: ArtistFormCategory[];
  handleInputChange: ChangeHandler;
  handleBlurNormalize: BlurHandler;
  handleCheckboxChange: (field: "shop_category_ids", value: string) => () => void;
  onAddressSearch: () => void;
  onIntroduceChange: (qa: IntroduceQA, text: string) => void;
  onBusinessHoursChange: (hours: BusinessHoursMap) => void;
}>): React.ReactElement {
  return (
    <div className="space-y-6 p-4">
      <TextField label={t.artistName} value={formData.title} onChange={handleInputChange("title")} onBlur={handleBlurNormalize("title")} placeholder={t.artistNamePlaceholder} required />
      <TextField label={t.phone} value={formData.contact} onChange={handleInputChange("contact")} placeholder={t.phonePlaceholder} required type="tel" />
      <TextField label={t.instagramUrl} value={formData.instagram_url} onChange={handleInputChange("instagram_url")} placeholder={t.instagramUrlPlaceholder} type="url" />
      <TextFieldWithHint label={t.kakaoUrl} value={formData.kakao_url} onChange={handleInputChange("kakao_url")} placeholder={t.kakaoUrlPlaceholder} hint={t.kakaoUrlHint} />
      <AddressField formData={formData} onSearch={onAddressSearch} onChange={handleInputChange} t={formLabels} />

      <IntroduceSeoPreview
        shopName={formData.title}
        introduce={formData.introduce}
        region={formData.address}
        imageCount={0}
      />
      <GuidedIntroduce
        initial={formData.introduce_qa}
        initialText={formData.introduce}
        onChange={onIntroduceChange}
      />
      <BusinessHoursField
        value={formData.business_hours}
        onChange={onBusinessHoursChange}
      />
      <CategoryCheckboxGroup label={t.shopInfo} categories={shopCategories} selectedIds={formData.shop_category_ids} onToggle={handleCheckboxChange} field="shop_category_ids" />
    </div>
  );
}
