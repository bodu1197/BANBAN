// @client-reason: Multi-step form with controlled state, file uploads, and AI generation
"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { optimizeImage } from "@/lib/utils/image-optimizer";
import { calcDiscountRate } from "@/components/portfolio-form/portfolio-helpers";
import {
  INITIAL_FORM_VALUES,
  type EventFormValues,
  type EventMediaSlot,
  type GeneratedEventContent,
} from "@/components/event-form/types";
import { EventStepBasic } from "./EventStepBasic";
import { EventStepDetails } from "./EventStepDetails";
import { EventStepPhotos } from "./EventStepPhotos";
import { EventStepPreview } from "./EventStepPreview";

const STEPS = ["기본 정보", "상세 정보", "사진 업로드", "AI 생성 & 등록"] as const;

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
  const [aiContent, setAiContent] = useState<GeneratedEventContent | null>(null);
  const [aiImagePath, setAiImagePath] = useState<string | null>(null);
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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

  const generateAiContent = useCallback(async () => {
    if (!artist) return;
    setIsGenerating(true);
    try {
      const body = {
        ...formValues,
        discountRate,
        shopName: formValues.shopName || artist.title,
      };
      const res = await fetch("/api/ai/generate-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiContent(data.content as GeneratedEventContent);
    } catch (e) {
      alert(`AI 생성 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    } finally {
      setIsGenerating(false);
    }
  }, [formValues, artist, discountRate]);

  const generateAiImage = useCallback(async () => {
    if (!artist) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-event-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formValues.category,
          procedureName: formValues.procedureName,
          title: formValues.title,
          price: Number(formValues.price),
          priceOrigin: Number(formValues.priceOrigin),
          discountRate,
          shopName: formValues.shopName || artist.title,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiImagePath(data.path as string);
      setAiImagePreview(data.b64Preview as string);
    } catch (e) {
      alert(`이미지 생성 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    } finally {
      setIsGenerating(false);
    }
  }, [formValues, artist, discountRate]);

  const handleSubmit = useCallback(async () => {
    if (!artist || !aiContent) return;
    setIsSubmitting(true);
    try {
      const supabase = createClient();

      const uploadedPaths = await Promise.all(
        mediaSlots.map(async (slot, i) => {
          if (!slot.file) return null;
          const optimized = await optimizeImage(slot.file, { maxWidth: 1600, maxHeight: 1600, quality: 0.85 });
          const path = `${artist.id}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.webp`;
          const { error } = await supabase.storage.from("events").upload(path, optimized, {
            cacheControl: "31536000",
            upsert: false,
            contentType: "image/webp",
          });
          if (error) throw new Error(`사진 업로드 실패: ${error.message}`);
          return { storage_path: path, media_type: slot.type, order_index: i };
        }),
      ).then((results) => results.filter((r): r is NonNullable<typeof r> => r !== null));

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
        ai_generated_content: aiContent,
        ai_generated_image_path: aiImagePath,
        status: "published",
      };

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: eventPayload, media: uploadedPaths }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const { id } = result as { id: string };

      router.push(`/events/${id}`);
    } catch (e) {
      alert(`등록 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [artist, aiContent, aiImagePath, formValues, mediaSlots, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center" role="status" aria-label="로딩 중">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
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
                  ? "bg-brand-primary/20 text-brand-primary cursor-pointer"
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
        <EventStepPreview
          values={formValues}
          mediaSlots={mediaSlots}
          aiContent={aiContent}
          aiImagePreview={aiImagePreview}
          isGenerating={isGenerating}
          isSubmitting={isSubmitting}
          onGenerateText={generateAiContent}
          onGenerateImage={generateAiImage}
          onSubmit={handleSubmit}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
