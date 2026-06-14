// @client-reason: 포트폴리오 작성 폼 상태 훅 — useState/useEffect 기반. 작성 폼·온보딩 위저드 공용.
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CategoryItem } from "@/types/portfolio-search";
import { fetchCategories } from "@/lib/portfolio/client-helpers";
import { EMPTY_PORTFOLIO_FORM, requestAiDescription } from "./portfolio-submit";
import type { PortfolioFormValues } from "./types";

export interface PortfolioFormState {
  formValues: PortfolioFormValues;
  setFormValues: React.Dispatch<React.SetStateAction<PortfolioFormValues>>;
  images: File[];
  imagePreviews: string[];
  handleImageFiles: (files: File[]) => void;
  categories: CategoryItem[];
  selectedCategories: Set<string>;
  setSelectedCategories: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectCategory: (id: string) => void;
  selectedExhibitions: Set<string>;
  toggleExhibition: (id: string) => void;
  aiDescribing: boolean;
  handleAiDescribe: () => Promise<void>;
  resetForm: () => void;
}

/**
 * 작품 1건 작성에 필요한 폼 상태 + 핸들러 묶음. PortfolioWriteClient(마이페이지)와
 * 온보딩 위저드 PortfolioStep 이 동일 상태/핸들러를 공유(중복 제거). 제출 로직은 호출부가 보유.
 */
export function usePortfolioFormState(typeArtist: string | null | undefined): PortfolioFormState {
  const [formValues, setFormValues] = useState<PortfolioFormValues>(EMPTY_PORTFOLIO_FORM);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedExhibitions, setSelectedExhibitions] = useState<Set<string>>(new Set());
  const [aiDescribing, setAiDescribing] = useState(false);

  useEffect(() => {
    if (!typeArtist) return;
    const supabase = createClient();
    fetchCategories(supabase, typeArtist).then(setCategories);
  }, [typeArtist]);

  function handleImageFiles(files: File[]): void {
    setImages(files);
    // 교체로 버려지는 '미추가' 미리보기 URL 해제(누수 방지). 추가 완료된 URL 은 호출부가 보관하므로 여기 없음.
    setImagePreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return files.map((f) => URL.createObjectURL(f));
    });
  }

  async function handleAiDescribe(): Promise<void> {
    const image = images[0]; // 체크 후 접근 사이 state 변동 방지 — 캡처.
    if (!image) { alert("작품 사진을 먼저 업로드해주세요."); return; }
    setAiDescribing(true);
    try {
      const desc = await requestAiDescription(image);
      if (!desc) { alert("AI 설명 생성에 실패했습니다. 잠시 후 다시 시도해주세요."); return; }
      setFormValues((prev) => ({ ...prev, description: desc }));
    } catch {
      alert("AI 설명 생성 중 오류가 발생했습니다.");
    } finally {
      setAiDescribing(false);
    }
  }

  function selectCategory(id: string): void {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    setSelectedCategories((prev) => {
      const sameTypeIds = new Set(categories.filter((c) => c.type === cat.type).map((c) => c.id));
      const next = new Set([...prev].filter((prevId) => !sameTypeIds.has(prevId)));
      next.add(id);
      return next;
    });
  }

  function toggleExhibition(id: string): void {
    setSelectedExhibitions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetForm(): void {
    setFormValues(EMPTY_PORTFOLIO_FORM);
    setImages([]);
    setImagePreviews([]); // 추가 완료된 URL 은 호출부 소유 — 여기서 revoke 하지 않는다.
    setSelectedCategories(new Set());
    setSelectedExhibitions(new Set());
  }

  return {
    formValues, setFormValues, images, imagePreviews, handleImageFiles,
    categories, selectedCategories, setSelectedCategories, selectCategory,
    selectedExhibitions, toggleExhibition, aiDescribing, handleAiDescribe, resetForm,
  };
}
