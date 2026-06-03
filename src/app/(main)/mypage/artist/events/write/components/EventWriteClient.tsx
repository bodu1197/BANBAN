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
const THUMBNAIL_ORDER_INDEX = 0;
const DETAIL_SECTION_ORDER_OFFSET = 100;

type UploadedMedia = { storage_path: string; media_type: string; order_index: number };
type DetailMedia = UploadedMedia & { alt_text: string | null };

type EventPayload = {
  artist_id: string;
  procedure_name: string;
  title: string;
  price_origin: number;
  price: number;
  discount_rate: number;
  retouch_type: EventFormValues["retouchType"];
  retouch_description: string | null;
  event_period_text: string | null;
  event_start_at: string | null;
  event_end_at: string | null;
  procedure_summary: string;
  target_audience: string[];
  shop_name: string;
  shop_region: string | null;
  shop_business_hours: string | null;
  shop_parking: string | null;
  shop_booking_method: string | null;
  procedure_duration: string | null;
  maintenance_period: string | null;
  procedure_advantages: string[];
  precautions: string | null;
  artist_introduction: string | null;
  ai_generated_content: GeneratedDetailCopy | null;
  ai_generated_image_path: string | null;
  status: string;
};

function extractErrorMessage(result: unknown, fallback: string): string {
  if (typeof result === "object" && result !== null && "error" in result) {
    return String((result as Record<string, unknown>).error);
  }
  return fallback;
}

function isValidUploadResult(result: unknown): result is UploadedMedia {
  if (typeof result !== "object" || result === null) return false;
  const r = result as Record<string, unknown>;
  return (
    typeof r.storage_path === "string"
    && typeof r.media_type === "string"
    && typeof r.order_index === "number"
  );
}

async function uploadMediaSlot(slot: EventMediaSlot, index: number): Promise<UploadedMedia | null> {
  if (!slot.file) return null;
  const body = new FormData();
  body.append("file", slot.file);
  body.append("mediaType", slot.type);
  body.append("orderIndex", String(index));
  const res = await fetch("/api/events/upload", { method: "POST", body });
  const result: unknown = await res.json();
  if (!res.ok) {
    throw new Error(`${slot.label} 업로드 실패: ${extractErrorMessage(result, "알 수 없는 오류")}`);
  }
  if (!isValidUploadResult(result)) {
    throw new Error(`${slot.label} 업로드 응답이 올바르지 않습니다`);
  }
  const { storage_path, media_type, order_index } = result;
  return { storage_path, media_type, order_index };
}

async function uploadAllMediaSlots(slots: EventMediaSlot[]): Promise<UploadedMedia[]> {
  const results = await Promise.all(slots.map(uploadMediaSlot));
  return results.filter((r): r is UploadedMedia => r !== null);
}

function buildDetailMedia(detailSections: DetailSectionResult[], title: string): DetailMedia[] {
  const detailMedia: DetailMedia[] = detailSections
    .filter((s) => s.status === "completed" && s.storagePath)
    .map((s, i) => ({
      storage_path: s.storagePath,
      media_type: s.sectionType,
      order_index: DETAIL_SECTION_ORDER_OFFSET + i,
      alt_text: s.altText || null,
    }));

  const heroSection = detailSections.find((s) => s.sectionType === "detail_hero" && s.status === "completed");
  const thumbnailStorage = heroSection?.thumbnailPath ?? heroSection?.storagePath;
  if (thumbnailStorage) {
    detailMedia.push({
      storage_path: thumbnailStorage,
      media_type: "thumbnail",
      order_index: THUMBNAIL_ORDER_INDEX,
      alt_text: title || null,
    });
  }

  return detailMedia;
}

function nullable<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

function buildEventPayload(
  formValues: EventFormValues,
  artist: { id: string; title: string },
  discountRate: number,
  detailCopy: GeneratedDetailCopy | null,
): EventPayload {
  const allTargets = [
    ...formValues.targetAudience,
    ...(formValues.customTarget ? [formValues.customTarget] : []),
  ];

  return {
    artist_id: artist.id,
    procedure_name: formValues.procedureName,
    title: formValues.title,
    price_origin: Number(formValues.priceOrigin),
    price: Number(formValues.price),
    discount_rate: discountRate,
    retouch_type: formValues.retouchType,
    retouch_description: nullable(formValues.retouchDescription),
    event_period_text: nullable(formValues.eventPeriodText),
    event_start_at: nullable(formValues.eventStartAt),
    event_end_at: nullable(formValues.eventEndAt),
    procedure_summary: formValues.procedureSummary,
    target_audience: allTargets,
    shop_name: formValues.shopName || artist.title,
    shop_region: nullable(formValues.shopRegion),
    shop_business_hours: nullable(formValues.shopBusinessHours),
    shop_parking: nullable(formValues.shopParking),
    shop_booking_method: nullable(formValues.shopBookingMethod),
    procedure_duration: nullable(formValues.procedureDuration),
    maintenance_period: nullable(formValues.maintenancePeriod),
    procedure_advantages: formValues.procedureAdvantages.filter(Boolean),
    precautions: nullable(formValues.precautions),
    artist_introduction: nullable(formValues.artistIntroduction),
    ai_generated_content: detailCopy,
    ai_generated_image_path: null,
    status: "published",
  };
}

async function createEvent(eventPayload: ReturnType<typeof buildEventPayload>, media: UploadedMedia[]): Promise<string> {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: eventPayload, media }),
  });
  const result: unknown = await res.json();
  if (!res.ok) {
    throw new Error(extractErrorMessage(result, "이벤트 등록에 실패했습니다"));
  }
  if (typeof result !== "object" || result === null || typeof (result as Record<string, unknown>).id !== "string") {
    throw new Error("이벤트 등록 응답이 올바르지 않습니다");
  }
  return (result as { id: string }).id;
}

function getStepButtonClass(index: number, currentStep: number): string {
  if (index === currentStep) return "bg-brand-primary text-white";
  if (index < currentStep) {
    return "bg-brand-primary/20 text-brand-primary cursor-pointer hover:bg-brand-primary/30 focus-visible:bg-brand-primary/30";
  }
  return "bg-muted text-muted-foreground";
}

type StepIndicatorProps = {
  currentStep: number;
  onStepSelect: (index: number) => void;
};

function StepIndicator({ currentStep, onStepSelect }: Readonly<StepIndicatorProps>): React.ReactElement {
  return (
    <div className="flex gap-1">
      {STEPS.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => (i < currentStep ? onStepSelect(i) : undefined)}
          className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring ${getStepButtonClass(i, currentStep)}`}
          aria-label={`${label} (${i + 1}/${STEPS.length})`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

type StepContentProps = Readonly<{
  currentStep: number;
  formValues: EventFormValues;
  artist: { id: string; title: string };
  mediaSlots: EventMediaSlot[];
  discountRate: number;
  detailCopy: GeneratedDetailCopy | null;
  detailSections: DetailSectionResult[];
  isSubmitting: boolean;
  updateForm: (updates: Partial<EventFormValues>) => void;
  onMediaSlotsChange: (slots: EventMediaSlot[]) => void;
  onDetailCopyChange: (copy: GeneratedDetailCopy | null) => void;
  onDetailSectionsChange: (sections: DetailSectionResult[]) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}>;

function AuthLoadingState(): React.ReactElement {
  return (
    <div className="flex min-h-[400px] items-center justify-center" role="status" aria-label="로딩 중">
      <div className="h-8 w-8 motion-safe:animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
    </div>
  );
}

function NoArtistState(): React.ReactElement {
  return (
    <div className="py-20 text-center text-muted-foreground">
      아티스트 계정으로 로그인해주세요.
    </div>
  );
}

function StepContent(props: StepContentProps): React.ReactElement | null {
  const { currentStep, formValues, artist } = props;
  if (currentStep === 0) {
    return <EventStepBasic values={formValues} onChange={props.updateForm} onNext={props.onNext} />;
  }
  if (currentStep === 1) {
    return (
      <EventStepDetails
        values={formValues}
        onChange={props.updateForm}
        artistTitle={artist.title}
        onNext={props.onNext}
        onBack={props.onBack}
      />
    );
  }
  if (currentStep === 2) {
    return (
      <EventStepPhotos
        slots={props.mediaSlots}
        onSlotsChange={props.onMediaSlotsChange}
        onNext={props.onNext}
        onBack={props.onBack}
      />
    );
  }
  if (currentStep === 3) {
    return (
      <EventStepGenerate
        values={formValues}
        mediaSlots={props.mediaSlots}
        discountRate={props.discountRate}
        detailCopy={props.detailCopy}
        detailSections={props.detailSections}
        isSubmitting={props.isSubmitting}
        onDetailCopyChange={props.onDetailCopyChange}
        onDetailSectionsChange={props.onDetailSectionsChange}
        onSubmit={props.onSubmit}
        onBack={props.onBack}
      />
    );
  }
  return null;
}

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
      const uploadedOriginals = await uploadAllMediaSlots(mediaSlots);
      const detailMedia = buildDetailMedia(detailSections, formValues.title);
      const eventPayload = buildEventPayload(formValues, artist, discountRate, detailCopy);
      const allMedia = [...uploadedOriginals, ...detailMedia];
      const id = await createEvent(eventPayload, allMedia);
      router.push(`/events/${id}`);
    } catch (e: unknown) {
      alert(`등록 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [artist, detailCopy, detailSections, formValues, mediaSlots, discountRate, router]);

  if (authLoading) return <AuthLoadingState />;

  if (!artist) return <NoArtistState />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">이벤트 등록</h1>

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} onStepSelect={setCurrentStep} />

      {/* Step content */}
      <StepContent
        currentStep={currentStep}
        formValues={formValues}
        artist={artist}
        mediaSlots={mediaSlots}
        discountRate={discountRate}
        detailCopy={detailCopy}
        detailSections={detailSections}
        isSubmitting={isSubmitting}
        updateForm={updateForm}
        onMediaSlotsChange={setMediaSlots}
        onDetailCopyChange={setDetailCopy}
        onDetailSectionsChange={setDetailSections}
        onNext={handleNext}
        onBack={handleBack}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
