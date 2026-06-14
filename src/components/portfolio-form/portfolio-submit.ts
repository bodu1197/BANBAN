/**
 * 포트폴리오 작성 공용 로직 — 마이페이지 작성 폼(PortfolioWriteClient)과
 * 아티스트 온보딩 위저드(PortfolioStep)가 동일한 생성/검증/AI설명 경로를 공유한다.
 *
 * 컴포넌트가 아닌 client-side 헬퍼 모듈(브라우저 Supabase + FileReader + fetch 사용).
 * client component 에서만 import 한다. 순수 함수가 아니므로 lib/portfolio/helpers(pure) 와 분리.
 * createPortfolioRecord 는 server action submitExhibitionEntry 를 RPC 로 호출한다(Next 표준 패턴).
 */

import {
  uploadFiles,
  insertMediaRowsWithEmbedding,
  insertCategorizables,
} from "@/lib/portfolio/client-helpers";
import { calcDiscountRate } from "@/lib/portfolio/helpers";
import { createClient } from "@/lib/supabase/client";
import { submitExhibitionEntry } from "@/lib/actions/exhibition-entries";
import { MIN_DESCRIPTION_LEN } from "./portfolio-form-fields";
import type { PortfolioFormValues } from "./types";

/** 새 작품 폼의 초기값 — 작성/위저드 양쪽에서 동일 초기 상태 + '추가 후 리셋'에 재사용. */
export const EMPTY_PORTFOLIO_FORM: PortfolioFormValues = {
  title: "",
  description: "",
  price: "",
  priceOrigin: "",
  isEvent: false,
  isPermanentDiscount: false,
  saleEndedAt: "",
  youtubeUrl: "",
};

/** File → base64(데이터URL 접두 제거) — AI 설명 생성용 이미지 전송. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      const r = reader.result;
      resolve(typeof r === "string" ? (r.split(",")[1] ?? "") : "");
    };
    reader.onerror = (): void => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}

/** 작품 사진 1장으로 AI 설명 생성 요청. 실패 시 null(호출부가 안내). */
export async function requestAiDescription(image: File): Promise<string | null> {
  const imageBase64 = await fileToBase64(image);
  const res = await fetch("/api/ai/analyze-portfolio-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType: image.type }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { description?: string };
  return data.description ?? null;
}

/** 작품 폼 검증 — 충족 시 null, 미충족 시 사용자 안내 메시지 반환. */
export function validatePortfolioForm(args: Readonly<{
  formValues: PortfolioFormValues;
  imageCount: number;
  categoryCount: number;
}>): string | null {
  const { formValues, imageCount, categoryCount } = args;
  if (categoryCount === 0) return "대표 분류를 1개 이상 선택해주세요.";
  if (!formValues.title.trim()) return "제목을 입력해주세요.";
  if (imageCount !== 1) return "작품 사진은 1장만 등록해주세요. (포트폴리오 1개당 사진 1장)";
  if (formValues.description.trim().length < MIN_DESCRIPTION_LEN) {
    return `작품 설명은 ${MIN_DESCRIPTION_LEN}자 이상 입력해주세요. (작성이 어려우면 'AI로 설명 생성' 이용)`;
  }
  return null;
}

function parsePrices(formValues: PortfolioFormValues): {
  priceNum: number; priceOriginNum: number; discountRate: number; saleEnd: string | null;
} {
  const priceNum = Number(formValues.price) || 0;
  const priceOriginNum = Number(formValues.priceOrigin) || priceNum;
  const saleEnd = formValues.isEvent && !formValues.isPermanentDiscount && formValues.saleEndedAt
    ? formValues.saleEndedAt : null;
  return { priceNum, priceOriginNum, discountRate: calcDiscountRate(priceNum, priceOriginNum), saleEnd };
}

export interface CreatePortfolioArgs {
  artistId: string;
  formValues: PortfolioFormValues;
  images: File[];
  categoryIds: string[];
  /** isEvent 인 경우에만 출품 처리되는 기획전 id 목록. */
  exhibitionIds: string[];
}

/**
 * 작품 1건 생성 — 사진 업로드 → portfolios insert → media(임베딩) → 분류 → (이벤트 시)기획전 출품.
 * 생성된 portfolioId 반환. 검증은 호출 전 validatePortfolioForm 으로 수행(여기선 분류 누락만 방어).
 */
export async function createPortfolioRecord(args: Readonly<CreatePortfolioArgs>): Promise<string | null> {
  const { artistId, formValues, images, categoryIds, exhibitionIds } = args;
  if (categoryIds.length === 0) throw new Error("CATEGORY_REQUIRED");
  const supabase = createClient();
  const imagePaths = await uploadFiles(supabase, artistId, images);
  const { priceNum, priceOriginNum, discountRate, saleEnd } = parsePrices(formValues);
  const { data: portfolio, error } = await supabase
    .from("portfolios")
    .insert({
      artist_id: artistId, title: formValues.title, description: formValues.description,
      price: priceNum, price_origin: priceOriginNum, discount_rate: discountRate, sale_ended_at: saleEnd,
      youtube_url: formValues.youtubeUrl || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  if (!portfolio) return null;
  await insertMediaRowsWithEmbedding(supabase, portfolio.id, imagePaths, "image", 0);
  await insertCategorizables(supabase, portfolio.id, categoryIds);
  if (formValues.isEvent && exhibitionIds.length > 0) {
    await Promise.all(exhibitionIds.map((exId) => submitExhibitionEntry(exId, portfolio.id)));
  }
  return portfolio.id;
}
