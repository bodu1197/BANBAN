// @client-reason: File input + image preview for 3 photo slots
"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import type { EventMediaSlot } from "@/components/event-form/types";

export function EventStepPhotos({
  slots,
  onSlotsChange,
  onNext,
  onBack,
}: Readonly<{
  slots: EventMediaSlot[];
  onSlotsChange: (slots: EventMediaSlot[]) => void;
  onNext: () => void;
  onBack: () => void;
}>): React.ReactElement {
  const fileRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

  const handleFileSelect = useCallback(
    (index: number, file: File | null) => {
      const next = [...slots];
      if (file) {
        next[index] = {
          ...next[index],
          file,
          preview: URL.createObjectURL(file),
        };
      } else {
        if (next[index].preview) URL.revokeObjectURL(next[index].preview);
        next[index] = { ...next[index], file: null, preview: "" };
      }
      onSlotsChange(next);
    },
    [slots, onSlotsChange],
  );

  const allFilled = slots.every((s) => s.file !== null);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        이벤트 상세 페이지에 표시될 사진 3장을 업로드해주세요.
      </p>

      <div className="grid gap-4">
        {slots.map((slot, i) => (
          <div key={slot.type} className="space-y-2">
            <p className="text-sm font-medium">
              {slot.label} <span className="text-destructive">*</span>
            </p>
            <div
              className="relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-input bg-muted/30 transition-colors hover:border-brand-primary/50 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-brand-primary/50 focus-visible:bg-muted/50"
              role="button"
              tabIndex={0}
              onClick={() => fileRefs.current[i]?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileRefs.current[i]?.click();
              }}
              aria-label={`${slot.label} 업로드`}
            >
              {slot.preview ? (
                <>
                  <Image
                    src={slot.preview}
                    alt={slot.label}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileSelect(i, null);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-opacity hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-black/80"
                    aria-label="사진 삭제"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <span className="text-sm">{slot.label} 추가</span>
                </div>
              )}
              <input
                ref={(el) => { fileRefs.current[i] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(i, e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        ))}
      </div>

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
          disabled={!allFilled}
          onClick={onNext}
          className="flex-1 rounded-lg bg-brand-primary py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          다음 단계
        </button>
      </div>
    </div>
  );
}
