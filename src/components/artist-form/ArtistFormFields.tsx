// @client-reason: Form field components with onChange handlers
"use client";

import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BANK_OPTIONS } from "@/types/artist-form";
import type { ArtistFormData, ArtistFormCategory } from "@/types/artist-form";
import { normalizeFancyText } from "@/lib/normalize-text";

// --- Shared labels interface (subset of dictionary) ---

export interface ArtistFormLabels {
  type: string;
  typeTattoo: string;
  typeSemiPermanent: string;
  artistName: string;
  artistNamePlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  instagramUrl: string;
  instagramUrlPlaceholder: string;
  kakaoUrl: string;
  kakaoUrlPlaceholder: string;
  kakaoUrlHint: string;
  address: string;
  zipcode: string;
  addressSearch: string;
  addressPlaceholder: string;
  addressDetailPlaceholder: string;
  region: string;
  introduce: string;
  introducePlaceholder: string;
  description: string;
  descriptionPlaceholder: string;
  shopInfo: string;
  bankHolder: string;
  bankHolderPlaceholder: string;
  bankName: string;
  bankNamePlaceholder: string;
  bankAccount: string;
  bankAccountPlaceholder: string;
}

export function buildFormLabels(t: ArtistFormLabels): ArtistFormLabels {
  return t;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildFormLabelsFromDict(t: any): ArtistFormLabels {
  return {
    type: t.type, typeTattoo: t.typeTattoo, typeSemiPermanent: t.typeSemiPermanent,
    artistName: t.artistName, artistNamePlaceholder: t.artistNamePlaceholder,
    phone: t.phone, phonePlaceholder: t.phonePlaceholder,
    instagramUrl: t.instagramUrl, instagramUrlPlaceholder: t.instagramUrlPlaceholder,
    kakaoUrl: t.kakaoUrl, kakaoUrlPlaceholder: t.kakaoUrlPlaceholder, kakaoUrlHint: t.kakaoUrlHint,
    address: t.address, zipcode: t.zipcode, addressSearch: t.addressSearch,
    addressPlaceholder: t.addressPlaceholder, addressDetailPlaceholder: t.addressDetailPlaceholder,
    region: t.region, introduce: t.introduce, introducePlaceholder: t.introducePlaceholder,
    description: t.description, descriptionPlaceholder: t.descriptionPlaceholder,
    shopInfo: t.shopInfo,
    bankHolder: t.bankHolder, bankHolderPlaceholder: t.bankHolderPlaceholder,
    bankName: t.bankName, bankNamePlaceholder: t.bankNamePlaceholder,
    bankAccount: t.bankAccount, bankAccountPlaceholder: t.bankAccountPlaceholder,
  };
}

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((id) => id !== value) : [...list, value];
}

const NORMALIZE_FIELDS = new Set<keyof ArtistFormData>(["title", "introduce", "description"]);

export function useArtistFormHandlers(
  setFormData: React.Dispatch<React.SetStateAction<ArtistFormData>>,
): {
  handleInputChange: (field: keyof ArtistFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleCheckboxChange: (field: "shop_category_ids", value: string) => () => void;
} {
  const handleInputChange = useCallback(
    (field: keyof ArtistFormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = NORMALIZE_FIELDS.has(field) ? normalizeFancyText(e.target.value) : e.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
      },
    [setFormData],
  );

  const handleCheckboxChange = useCallback(
    (field: "shop_category_ids", value: string) => () => {
      // eslint-disable-next-line security/detect-object-injection -- field is restricted union type
      setFormData((prev) => ({ ...prev, [field]: toggleInList(prev[field], value) }));
    },
    [setFormData],
  );

  return { handleInputChange, handleCheckboxChange };
}

export function useArtistCategories(
  categories: ArtistFormCategory[],
): { shopCategories: ArtistFormCategory[] } {
  const shopCategories = useMemo(() => {
    return categories.filter((c) => c.category_type === "SHOP");
  }, [categories]);

  return { shopCategories };
}

// --- Field Components ---

export function TypeField({ formData, setFormData, t }: Readonly<{
  formData: ArtistFormData; setFormData: React.Dispatch<React.SetStateAction<ArtistFormData>>; t: ArtistFormLabels;
}>): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {t.type} <span className="text-red-500">*</span>
      </Label>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="type_artist"
            value="SEMI_PERMANENT"
            checked={formData.type_artist === "SEMI_PERMANENT"}
            onChange={() => setFormData((prev) => ({ ...prev, type_artist: "SEMI_PERMANENT" }))}
            className="h-4 w-4 accent-brand-primary"
          />
          <span className="text-sm">{t.typeSemiPermanent}</span>
        </label>
      </div>
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder, required, type = "text", inputMode }: Readonly<{
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string; required?: boolean; type?: string; inputMode?: "numeric";
}>): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input type={type} value={value} onChange={onChange} placeholder={placeholder} inputMode={inputMode} />
    </div>
  );
}

export function TextFieldWithHint({ label, value, onChange, placeholder, hint }: Readonly<{
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string; hint: string;
}>): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Input type="url" value={value} onChange={onChange} placeholder={placeholder} />
      <p className="whitespace-pre-line text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function AddressField({ formData, onSearch, onChange, t }: Readonly<{
  formData: ArtistFormData; onSearch: () => void;
  onChange: (field: keyof ArtistFormData) => (e: React.ChangeEvent<HTMLInputElement>) => void; t: ArtistFormLabels;
}>): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {t.address} <span className="text-red-500">*</span>
      </Label>
      <div className="flex gap-2">
        <Input type="text" value={formData.zipcode} readOnly placeholder={t.zipcode} className="flex-1 bg-muted" />
        <Button type="button" variant="outline" onClick={onSearch} className="shrink-0">{t.addressSearch}</Button>
      </div>
      <Input type="text" value={formData.address} readOnly placeholder={t.addressPlaceholder} className="bg-muted" />
      <Input type="text" value={formData.address_detail} onChange={onChange("address_detail")} placeholder={t.addressDetailPlaceholder} />
    </div>
  );
}

export function DescriptionField({ value, onChange, t }: Readonly<{
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; t: ArtistFormLabels;
}>): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{t.description}</Label>
      <Textarea value={value} onChange={onChange} placeholder={t.descriptionPlaceholder} rows={5} />
    </div>
  );
}

export function CategoryCheckboxGroup({ label, subtitle, categories, selectedIds, onToggle, field }: Readonly<{
  label: string; subtitle?: string; categories: ArtistFormCategory[]; selectedIds: string[];
  onToggle: (field: "shop_category_ids", value: string) => () => void;
  field: "shop_category_ids";
}>): React.ReactElement | null {
  if (categories.length === 0) return null;
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label} {subtitle && <small className="font-normal text-muted-foreground">({subtitle})</small>}
      </Label>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <label
            key={cat.id}
            className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors ${
              selectedIds.includes(cat.id)
                ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                : "border-border hover:bg-muted focus-visible:bg-muted"
            }`}
            tabIndex={0}
          >
            <input type="checkbox" checked={selectedIds.includes(cat.id)} onChange={onToggle(field, cat.id)} className="sr-only" />
            {cat.name}
          </label>
        ))}
      </div>
    </div>
  );
}

export function BankFields({ formData, onChange, setFormData, t }: Readonly<{
  formData: ArtistFormData;
  onChange: (field: keyof ArtistFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  setFormData: React.Dispatch<React.SetStateAction<ArtistFormData>>;
  t: ArtistFormLabels;
}>): React.ReactElement {
  return (
    <>
      <TextField label={t.bankHolder} value={formData.bank_holder} onChange={onChange("bank_holder")} placeholder={t.bankHolderPlaceholder} />
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t.bankName}</Label>
        <select
          value={formData.bank_name}
          onChange={onChange("bank_name")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">{t.bankNamePlaceholder}</option>
          {BANK_OPTIONS.map((bank) => (
            <option key={bank} value={bank}>{bank}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t.bankAccount}</Label>
        <Input
          type="text"
          value={formData.bank_account}
          onChange={(e) => setFormData((prev) => ({ ...prev, bank_account: e.target.value.replace(/\D/g, "") }))}
          placeholder={t.bankAccountPlaceholder}
          inputMode="numeric"
        />
      </div>
    </>
  );
}

export function DaumPostcodeModal({ isOpen, onClose }: Readonly<{
  isOpen: boolean; onClose: () => void;
}>): React.ReactElement | null {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="relative h-[500px] w-full max-w-lg rounded-lg bg-white">
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-white hover:bg-gray-700 focus-visible:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="닫기"
        >
          ×
        </button>
        <div id="daumPostcodeContainer" className="h-full w-full" />
      </div>
    </div>
  );
}
