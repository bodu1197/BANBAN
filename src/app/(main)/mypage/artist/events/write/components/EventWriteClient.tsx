// @client-reason: Multi-step form with controlled state, file uploads, and AI generation
"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { calcDiscountRate } from "@/components/portfolio-form/portfolio-helpers";
import {
  INITIAL_FORM_VALUES,
  type EventFormValues,
  type EventMediaSlot,
  type GeneratedDetailCopy,
  type DetailSectionResult,
} from "@/components/event-form/types";
import { EventStepBasic } from "./EventStepBasic";
import { EventStepDetails } from "./EventStepDetails";
import { EventStepPhotos } from "./EventStepPhotos";
import { EventStepGenerate } from "./EventStepGenerate";

const STEPS = ["기본 정보", "상세 정보", "사진 업로드", "AI 생성 & 등록"] as const;
const DETAIL_SECTION_ORDER_OFFSET = 100;

export function EventWriteClient(): React.ReactElement {
  const router = useRouter();
  const { artist, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [formValues, setFormValues] = useState<EventFormValues>(INITIAL_FORM_VALUES);
  const [mediaSlots, setMediaSlots] = useState<EventMediaSlot[]>([
    { file: null, preview: "", type: "hero", label: "대표 이미지" },
    { file: null, preview: "", type: "before_after", label: "시술 전후 사진" },
    { file: null, preview: "", type: "shop", label: "샵/작업 공간" },
  ]);
  const [detailCopy, setDetailCopy] = useState<GeneratedDetailCopy | null>(null);
  const [detailSections, setDetailSections] = useState<DetailSectionResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateForm = useCallback((updates: Partial<EventFormValues>) => {
    setFormValues((prev) => ({ ...prev, ...updates }));
  }, []);

  const discountRate = useMemo(
    () => calcDiscountRate(Number(formValues.price) || 0, Number(formValues.priceOrigin) || 0),
    [formValues.price, formValues.priceOrigin],
  );

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!artist || detailSections.length === 0) return;
    setIsSubmitting(true);
    try {
      const uploadedOriginals = await Promise.all(
        mediaSlots.map(async (slot, i) => {
          if (!slot.file) return null;
          const body = new FormData();
          body.append("file", slot.file);
          body.append("mediaType", slot.type);
          body.append("orderIndex", String(i));
          const res = await fetch("/api/events/upload", { method: "POST", body });
          const result: unknown = await res.json();
          if (!res.ok) {
            const errMsg = typeof result === "object" && result !== null && "error" in result
              ? String((result as Record<string, unknown>).error)
              : "알 수 없는 오류";
            throw new Error(`${slot.label} 업로드 실패: ${errMsg}`);
          }
          if (
            typeof result !== "object" || result === null
            || typeof (result as Record<string, unknown>).storage_path !== "string"
            || typeof (result as Record<string, unknown>).media_type !== "string"
            || typeof (result as Record<string, unknown>).order_index !== "number"
          ) {
            throw new Error(`${slot.label} 업로드 응답이 올바르지 않습니다`);
          }
          const { storage_path, media_type, order_index } = result as { storage_path: string; media_type: string; order_index: number };
          return { storage_path, media_type, order_index };
        }),
      ).then((results) => results.filter((r): r is NonNullable<typeof r> => r !== null));

      const detailMedia = detailSections
        .filter((s) => s.status === "completed" && s.storagePath)
        .map((s, i) => ({
          storage_path: s.storagePath,
          media_type: s.sectionType,
          order_index: DETAIL_SECTION_ORDER_OFFSET + i,
          alt_text: s.altText || null,
        }));

      const allTargets = [
        ...formValues.targetAudience,
        ...(formValues.customTarget ? [formValues.customTarget] : []),
      ];

      const eventPayload = {
        artist_id: artist.id,
        procedure_name: formValues.procedureName,
        title: formValues.title,
        price_origin: Number(formValues.priceOrigin),
        price: Number(formValues.price),
        discount_rate: discountRate,
        retouch_type: formValues.retouchType,
        retouch_description: formValues.retouchDescription ?? null,
        event_period_text: formValues.eventPeriodText ?? null,
        event_start_at: formValues.eventStartAt ?? null,
        event_end_at: formValues.eventEndAt ?? null,
        procedure_summary: formValues.procedureSummary,
        target_audience: allTargets,
        shop_name: formValues.shopName || artist.title,
        shop_region: formValues.shopRegion ?? null,
        shop_business_hours: formValues.shopBusinessHours ?? null,
        shop_parking: formValues.shopParking ?? null,
        shop_booking_method: formValues.shopBookingMethod ?? null,
        procedure_duration: formValues.procedureDuration ?? null,
        maintenance_period: formValues.maintenancePeriod ?? null,
        procedure_advantages: formValues.procedureAdvantages.filter(Boolean),
        precautions: formValues.precautions ?? null,
        artist_introduction: formValues.artistIntroduction ?? null,
        ai_generated_content: detailCopy,
        ai_generated_image_path: null,
        status: "published",
      };

      const allMedia = [...uploadedOriginals, ...detailMedia];

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: eventPayload, media: allMedia }),
      });
      const result: unknown = await res.json();
      if (!res.ok) {
        const errMsg = typeof result === "object" && result !== null && "error" in result
          ? String((result as Record<string, unknown>).error)
          : "이벤트 등록에 실패했습니다";
        throw new Error(errMsg);
      }
      if (typeof result !== "object" || result === null || typeof (result as Record<string, unknown>).id !== "string") {
        throw new Error("이벤트 등록 응답이 올바르지 않습니다");
      }
      const { id } = result as { id: string };

      router.push(`/events/${id}`);
    } catch (e) {
      alert(`등록 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [artist, detailCopy, detailSections, formValues, mediaSlots, discountRate, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center" role="status" aria-label="로딩 중">
        <div className="h-8 w-8 motion-safe:animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        아티스트 계정으로 로그인해주세요.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">이벤트 등록</h1>

      {/* Step indicator */}
      <div className="flex gap-1">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => i < currentStep ? setCurrentStep(i) : undefined}
            className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
              i === currentStep
                ? "bg-brand-primary text-white"
                : i < currentStep
                  ? "bg-brand-primary/20 text-brand-primary cursor-pointer hover:bg-brand-primary/30 focus-visible:bg-brand-primary/30"
                  : "bg-muted text-muted-foreground"
            }`}
            aria-label={`${label} (${i + 1}/${STEPS.length})`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Step content */}
      {currentStep === 0 && (
        <EventStepBasic values={formValues} onChange={updateForm} onNext={handleNext} />
      )}
      {currentStep === 1 && (
        <EventStepDetails
          values={formValues}
          onChange={updateForm}
          artistTitle={artist.title}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 2 && (
        <EventStepPhotos
          slots={mediaSlots}
          onSlotsChange={setMediaSlots}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 3 && (
        <EventStepGenerate
          values={formValues}
          mediaSlots={mediaSlots}
          discountRate={discountRate}
          detailCopy={detailCopy}
          detailSections={detailSections}
          isSubmitting={isSubmitting}
          onDetailCopyChange={setDetailCopy}
          onDetailSectionsChange={setDetailSections}
          onSubmit={handleSubmit}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
