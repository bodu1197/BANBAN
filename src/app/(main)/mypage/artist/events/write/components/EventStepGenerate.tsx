// @client-reason: AI image generation with parallel fetch, per-section progress tracking
"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import {
  DETAIL_SECTION_TYPES,
  DETAIL_SECTION_LABELS,
  EDIT_SECTIONS,
  type DetailSectionType,
  type DetailSectionResult,
  type GeneratedDetailCopy,
  type EventFormValues,
  type EventMediaSlot,
} from "@/components/event-form/types";

const MEDIA_TYPE_TO_SLOT: Partial<Record<DetailSectionType, number>> = {
  detail_hero: 0,
  detail_before_after: 1,
  detail_shop: 2,
};

interface EventStepGenerateProps {
  values: EventFormValues;
  mediaSlots: EventMediaSlot[];
  discountRate: number;
  detailCopy: GeneratedDetailCopy | null;
  detailSections: DetailSectionResult[];
  isSubmitting: boolean;
  onDetailCopyChange: (copy: GeneratedDetailCopy) => void;
  onDetailSectionsChange: (sections: DetailSectionResult[]) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function EventStepGenerate({
  values,
  mediaSlots,
  discountRate,
  detailCopy,
  detailSections,
  isSubmitting,
  onDetailCopyChange,
  onDetailSectionsChange,
  onSubmit,
  onBack,
}: Readonly<EventStepGenerateProps>): React.ReactElement {
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [generatingSection, setGeneratingSection] = useState<Set<DetailSectionType>>(new Set());

  const completedCount = detailSections.filter((s) => s.status === "completed").length;
  const allCompleted = completedCount === DETAIL_SECTION_TYPES.length;

  const generateCopy = useCallback(async (): Promise<GeneratedDetailCopy | null> => {
    setIsGeneratingCopy(true);
    try {
      const body = {
        ...values,
        discountRate,
        shopName: values.shopName || "샵",
      };
      const res = await fetch("/api/ai/generate-event-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const rawText = await res.text();
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`텍스트 생성 서버 오류 (${res.status})`);
      }
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "생성 실패");
      if (!data.content || typeof data.content !== "object" || !("sections" in data.content)) {
        throw new Error("AI 응답 구조가 올바르지 않습니다");
      }
      const copy = data.content as GeneratedDetailCopy;
      onDetailCopyChange(copy);
      return copy;
    } catch (e: unknown) {
      alert(`텍스트 카피 생성 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
      return null;
    } finally {
      setIsGeneratingCopy(false);
    }
  }, [values, discountRate, onDetailCopyChange]);

  const generateSectionImage = useCallback(
    async (sectionType: DetailSectionType, copy: GeneratedDetailCopy) => {
      setGeneratingSection((prev) => new Set(prev).add(sectionType));

      onDetailSectionsChange(
        detailSections.map((s) =>
          s.sectionType === sectionType ? { ...s, status: "generating" as const, error: undefined } : s,
        ),
      );

      try {
        const fd = new FormData();
        fd.append("sectionType", sectionType);
        fd.append("formData", JSON.stringify(values));
        fd.append("copyData", JSON.stringify(copy.sections));
        fd.append("discountRate", String(discountRate));

        if (EDIT_SECTIONS.includes(sectionType)) {
          const slotIdx = MEDIA_TYPE_TO_SLOT[sectionType];
          const file = slotIdx !== undefined ? mediaSlots[slotIdx]?.file : null;
          if (file) {
            fd.append("image", file);
          }
        }

        const res = await fetch("/api/ai/generate-event-section-image", {
          method: "POST",
          body: fd,
        });
        const text = await res.text();
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`이미지 생성 서버 오류 (${res.status})`);
        }
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "이미지 생성 실패");
        if (typeof data.storagePath !== "string" || typeof data.previewUrl !== "string") {
          throw new Error("이미지 데이터가 올바르지 않습니다");
        }

        return {
          sectionType,
          storagePath: data.storagePath,
          previewUrl: data.previewUrl,
          altText: copy.altTexts[sectionType] ?? "",
          status: "completed" as const,
          ...(typeof data.thumbnailPath === "string" ? { thumbnailPath: data.thumbnailPath } : {}),
        };
      } catch (e: unknown) {
        return {
          sectionType,
          storagePath: "",
          previewUrl: "",
          altText: "",
          status: "failed" as const,
          error: e instanceof Error ? e.message : "생성 실패",
        };
      } finally {
        setGeneratingSection((prev) => {
          const next = new Set(prev);
          next.delete(sectionType);
          return next;
        });
      }
    },
    [values, mediaSlots, discountRate, detailSections, onDetailSectionsChange],
  );

  const generateAll = useCallback(async () => {
    const copy = await generateCopy();
    if (!copy) return;

    const initial: DetailSectionResult[] = DETAIL_SECTION_TYPES.map((type) => ({
      sectionType: type,
      storagePath: "",
      previewUrl: "",
      altText: "",
      status: "generating" as const,
    }));
    onDetailSectionsChange(initial);

    const results = await Promise.allSettled(
      DETAIL_SECTION_TYPES.map((type) => generateSectionImage(type, copy)),
    );

    const final: DetailSectionResult[] = results.map((r, i) => {
      if (r.status === "fulfilled" && r.value) return r.value;
      return {
        sectionType: DETAIL_SECTION_TYPES[i],
        storagePath: "",
        previewUrl: "",
        altText: "",
        status: "failed" as const,
        error: r.status === "rejected" ? String(r.reason) : "생성 실패",
      };
    });
    onDetailSectionsChange(final);
  }, [generateCopy, generateSectionImage, onDetailSectionsChange]);

  const regenerateSection = useCallback(
    async (sectionType: DetailSectionType) => {
      if (!detailCopy) return;
      const result = await generateSectionImage(sectionType, detailCopy);
      if (result) {
        onDetailSectionsChange(
          detailSections.map((s) => (s.sectionType === sectionType ? result : s)),
        );
      }
    },
    [detailCopy, detailSections, generateSectionImage, onDetailSectionsChange],
  );

  const isAnyGenerating = isGeneratingCopy || generatingSection.size > 0;

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      <button
        type="button"
        disabled={isAnyGenerating}
        onClick={generateAll}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 py-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {isAnyGenerating ? (
          <span role="status" aria-label="AI 상세 이미지 생성 중" className="flex items-center gap-2">
            <span className="h-5 w-5 motion-safe:animate-spin rounded-full border-2 border-white border-t-transparent" />
            AI 상세 이미지 생성 중...
          </span>
        ) : detailSections.length > 0 ? (
          "전체 다시 생성"
        ) : (
          "AI 상세 이미지 자동 생성"
        )}
      </button>
      <p className="text-center text-sm text-foreground/80">
        <span aria-hidden="true">⏱️</span>
        <span className="sr-only">소요 시간 안내:</span>
        {" "}
        7개 섹션을 동시에 생성합니다. 최대 3분까지 소요될 수 있어요. 페이지를 닫지 말고 잠시 기다려주세요.
      </p>

      {/* Progress */}
      {detailSections.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {completedCount}/{DETAIL_SECTION_TYPES.length}개 완료
          {detailSections.some((s) => s.status === "failed") && (
            <span className="ml-2 text-red-500">
              ({detailSections.filter((s) => s.status === "failed").length}개 실패)
            </span>
          )}
        </p>
      )}

      {/* Section Grid */}
      {detailSections.length > 0 && (
        <div className="space-y-3">
          {detailSections.map((section) => (
            <div
              key={section.sectionType}
              className={`overflow-hidden rounded-lg border transition-colors ${
                section.status === "failed"
                  ? "border-red-300 dark:border-red-800"
                  : section.status === "completed"
                    ? "border-green-300 dark:border-green-800"
                    : "border-input"
              }`}
            >
              {/* Section Header */}
              <div className="flex items-center justify-between bg-muted/30 px-3 py-2">
                <span className="text-xs font-medium">
                  {DETAIL_SECTION_LABELS[section.sectionType]}
                </span>
                <div className="flex items-center gap-2">
                  {section.status === "generating" && (
                    <span className="h-3 w-3 motion-safe:animate-spin rounded-full border border-brand-primary border-t-transparent" />
                  )}
                  {section.status === "completed" && (
                    <span className="text-xs text-green-600 dark:text-green-400">완료</span>
                  )}
                  {section.status === "failed" && (
                    <span className="text-xs text-red-500">{section.error ?? "실패"}</span>
                  )}
                  {(section.status === "completed" || section.status === "failed") && !isAnyGenerating && (
                    <button
                      type="button"
                      onClick={() => regenerateSection(section.sectionType)}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`${DETAIL_SECTION_LABELS[section.sectionType]} 다시 생성`}
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Section Preview */}
              {section.status === "generating" && (
                <div className="flex h-40 items-center justify-center bg-muted/10">
                  <div className="h-6 w-6 motion-safe:animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
                </div>
              )}
              {section.status === "completed" && section.previewUrl && (
                <div className="relative aspect-[2/3]">
                  <Image
                    src={section.previewUrl}
                    alt={section.altText || DETAIL_SECTION_LABELS[section.sectionType]}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                </div>
              )}
              {section.status === "failed" && (
                <div className="flex h-24 items-center justify-center bg-red-50 dark:bg-red-950/20">
                  <p className="text-sm text-red-500">생성 실패 — 다시 시도해주세요</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-input py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          이전
        </button>
        <button
          type="button"
          disabled={!allCompleted || isSubmitting}
          onClick={onSubmit}
          className="flex-1 rounded-lg bg-brand-primary py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          {isSubmitting ? (
            <span role="status" aria-label="이벤트 등록 중" className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-white border-t-transparent" />
              등록 중...
            </span>
          ) : (
            "등록하기"
          )}
        </button>
      </div>
    </div>
  );
}
