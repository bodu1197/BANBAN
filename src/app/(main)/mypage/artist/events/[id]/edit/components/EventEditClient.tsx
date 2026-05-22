// @client-reason: Form with controlled state for editing event fields
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  RETOUCH_TYPES,
  TARGET_AUDIENCE_OPTIONS,
  type EventFormValues,
  type RetouchType,
} from "@/components/event-form/types";
import type { EventWithDetails } from "@/lib/supabase/event-queries";
import { EditBasicSection } from "./EditBasicSection";
import { EditDetailsSection } from "./EditDetailsSection";
import { EditOptionalSection } from "./EditOptionalSection";

function fallback(v: string | null | undefined): string {
  return v ?? "";
}

function parseTargets(raw: unknown): { known: string[]; custom: string } {
  const arr = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string")
    : [];
  const opts = TARGET_AUDIENCE_OPTIONS as readonly string[];
  return {
    known: arr.filter((t) => opts.includes(t)),
    custom: arr.find((t) => !opts.includes(t)) ?? "",
  };
}

function parseAdvantages(raw: unknown): [string, string, string] {
  const arr = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string")
    : [];
  return [arr[0] ?? "", arr[1] ?? "", arr[2] ?? ""];
}

function isRetouchType(v: unknown): v is RetouchType {
  return RETOUCH_TYPES.some((rt) => rt.value === v);
}

function eventToForm(event: EventWithDetails): EventFormValues {
  const { known, custom } = parseTargets(event.target_audience);
  return {
    category: "",
    procedureName: event.procedure_name,
    title: event.title,
    priceOrigin: String(event.price_origin),
    price: String(event.price),
    retouchType: isRetouchType(event.retouch_type) ? event.retouch_type : "included",
    retouchDescription: fallback(event.retouch_description),
    eventPeriodText: fallback(event.event_period_text),
    eventStartAt: fallback(event.event_start_at),
    eventEndAt: fallback(event.event_end_at),
    procedureSummary: event.procedure_summary,
    targetAudience: known,
    customTarget: custom,
    shopName: fallback(event.shop_name),
    shopRegion: fallback(event.shop_region),
    shopBusinessHours: fallback(event.shop_business_hours),
    shopParking: fallback(event.shop_parking),
    shopBookingMethod: fallback(event.shop_booking_method),
    procedureDuration: fallback(event.procedure_duration),
    maintenancePeriod: fallback(event.maintenance_period),
    procedureAdvantages: parseAdvantages(event.procedure_advantages),
    precautions: fallback(event.precautions),
    artistIntroduction: fallback(event.artist_introduction),
  };
}

function orNull(v: string): string | null {
  return v || null;
}

function buildSaveBody(values: EventFormValues, artistTitle: string): Record<string, unknown> {
  const allTargets = [
    ...values.targetAudience,
    ...(values.customTarget ? [values.customTarget] : []),
  ];
  return {
    procedure_name: values.procedureName,
    title: values.title,
    price_origin: Number(values.priceOrigin),
    price: Number(values.price),
    retouch_type: values.retouchType,
    retouch_description: orNull(values.retouchDescription),
    event_period_text: orNull(values.eventPeriodText),
    event_start_at: orNull(values.eventStartAt),
    event_end_at: orNull(values.eventEndAt),
    procedure_summary: values.procedureSummary,
    target_audience: allTargets,
    shop_name: values.shopName || artistTitle,
    shop_region: orNull(values.shopRegion),
    shop_business_hours: orNull(values.shopBusinessHours),
    shop_parking: orNull(values.shopParking),
    shop_booking_method: orNull(values.shopBookingMethod),
    procedure_duration: orNull(values.procedureDuration),
    maintenance_period: orNull(values.maintenancePeriod),
    procedure_advantages: values.procedureAdvantages.filter(Boolean),
    precautions: orNull(values.precautions),
    artist_introduction: orNull(values.artistIntroduction),
  };
}

function isFormValid(values: EventFormValues): boolean {
  const priceOk = (Number(values.priceOrigin) || 0) > 0 && (Number(values.price) || 0) > 0;
  return (
    values.procedureName.trim() !== "" &&
    values.title.trim() !== "" &&
    priceOk &&
    values.procedureSummary.trim() !== "" &&
    values.targetAudience.length > 0
  );
}

async function saveEvent(
  eventId: string,
  values: EventFormValues,
  artistTitle: string,
): Promise<void> {
  const res = await fetch(`/api/events/${eventId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildSaveBody(values, artistTitle)),
    signal: AbortSignal.timeout(30_000),
  });
  const result: unknown = await res.json();
  if (!res.ok) {
    const errMsg =
      typeof result === "object" && result !== null && "error" in result
        ? String((result as Record<string, unknown>).error)
        : "수정 실패";
    throw new Error(errMsg);
  }
}

// eslint-disable-next-line max-lines-per-function -- form wrapper with save logic + 3 section components
export function EventEditClient({
  event,
  artistTitle,
}: Readonly<{
  event: EventWithDetails;
  artistTitle: string;
}>): React.ReactElement {
  const router = useRouter();
  const [values, setValues] = useState<EventFormValues>(() => eventToForm(event));
  const [isSaving, setIsSaving] = useState(false);

  const update = useCallback((changes: Partial<EventFormValues>) => {
    setValues((prev) => ({ ...prev, ...changes }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveEvent(event.id, values, artistTitle);
      router.push(`/events/${event.id}`);
      router.refresh();
    } catch (e) {
      alert(`수정 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    } finally {
      setIsSaving(false);
    }
  }, [values, event.id, artistTitle, router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">이벤트 수정</h1>
      </div>

      <EditBasicSection values={values} onChange={update} />
      <EditDetailsSection values={values} onChange={update} artistTitle={artistTitle} />
      <EditOptionalSection values={values} onChange={update} />

      <div className="flex gap-3 pb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-lg border border-input py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!isFormValid(values) || isSaving}
          onClick={handleSave}
          className="flex-1 rounded-lg bg-brand-primary py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          {isSaving ? (
            <span role="status" aria-label="저장 중" className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-white border-t-transparent" />
              저장 중...
            </span>
          ) : (
            "저장하기"
          )}
        </button>
      </div>
    </div>
  );
}
