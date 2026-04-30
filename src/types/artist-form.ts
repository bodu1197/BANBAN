import type { ArtistType } from "./database";

export interface ArtistFormCategory {
  id: string;
  name: string;
  category_type: string | null;
}

export interface ArtistFormData {
  type_artist: ArtistType;
  title: string;
  contact: string;
  instagram_url: string;
  kakao_url: string;
  zipcode: string;
  address: string;
  address_detail: string;
  region_id: string;
  introduce: string;
  description: string;
  shop_category_ids: string[];
  bank_holder: string;
  bank_name: string;
  bank_account: string;
}

export const INITIAL_FORM_DATA: ArtistFormData = {
  type_artist: "SEMI_PERMANENT",
  title: "",
  contact: "",
  instagram_url: "",
  kakao_url: "",
  zipcode: "",
  address: "",
  address_detail: "",
  region_id: "",
  introduce: "",
  description: "",
  shop_category_ids: [],
  bank_holder: "",
  bank_name: "",
  bank_account: "",
};

export const BANK_OPTIONS = [
  "KB국민은행",
  "신한은행",
  "하나은행",
  "우리은행",
  "NH농협은행",
  "IBK기업은행",
  "SC제일은행",
  "씨티은행",
  "KDB산업은행",
  "케이뱅크",
  "카카오뱅크",
  "토스뱅크",
  "새마을금고",
  "신협",
  "우체국",
  "수협은행",
  "부산은행",
  "경남은행",
  "대구은행",
  "광주은행",
  "전북은행",
  "제주은행",
];

export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=kr&limit=1`,
      { headers: { "User-Agent": "Banunni/1.0 (howtattoo@banunni.com)" } },
    );
    const data = await response.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch { /* Continue without coordinates */ }
  return null;
}
