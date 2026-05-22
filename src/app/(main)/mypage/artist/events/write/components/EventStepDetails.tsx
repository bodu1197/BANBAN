// @client-reason: Form inputs with controlled state for step 2
"use client";

import { useState } from "react";
import {
  TARGET_AUDIENCE_OPTIONS,
  type EventFormValues,
} from "@/components/event-form/types";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/event-form/form-styles";

export function EventStepDetails({
  values,
  onChange,
  artistTitle,
  onNext,
  onBack,
}: Readonly<{
  values: EventFormValues;
  onChange: (updates: Partial<EventFormValues>) => void;
  artistTitle: string;
  onNext: () => void;
  onBack: () => void;
}>): React.ReactElement {
  const [showOptional, setShowOptional] = useState(false);

  const toggleTarget = (t: string) => {
    const next = values.targetAudience.includes(t)
      ? values.targetAudience.filter((x) => x !== t)
      : [...values.targetAudience, t];
    onChange({ targetAudience: next });
  };

  const canProceed = values.procedureSummary.trim() !== "" && values.targetAudience.length > 0;

  return (
    <div className="space-y-5">
      {/* 이벤트 기간 */}
      <div>
        <label htmlFor="evt-period-text" className={LABEL_CLASS}>이벤트 기간</label>
        <input
          id="evt-period-text"
          type="text"
          value={values.eventPeriodText}
          onChange={(e) => onChange({ eventPeriodText: e.target.value })}
          placeholder="예: 2026년 6월 30일까지, 선착순 20명"
          className={INPUT_CLASS}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="evt-start-at" className="text-xs text-muted-foreground">시작일</label>
            <input
              id="evt-start-at"
              type="date"
              value={values.eventStartAt}
              onChange={(e) => onChange({ eventStartAt: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="evt-end-at" className="text-xs text-muted-foreground">종료일</label>
            <input
              id="evt-end-at"
              type="date"
              value={values.eventEndAt}
              onChange={(e) => onChange({ eventEndAt: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </div>

      {/* 한 줄 소개 */}
      <div>
        <label htmlFor="evt-summary" className={LABEL_CLASS}>
          시술 한 줄 소개 <span className="text-destructive">*</span>
        </label>
        <input
          id="evt-summary"
          type="text"
          value={values.procedureSummary}
          onChange={(e) => onChange({ procedureSummary: e.target.value })}
          placeholder="예: 자연스럽고 깔끔한 눈썹을 원하는 분께 추천해요."
          maxLength={100}
          className={INPUT_CLASS}
        />
        <p className="mt-1 text-xs text-muted-foreground text-right">
          {values.procedureSummary.length}/100
        </p>
      </div>

      {/* 추천 대상 */}
      <div>
        <p className={LABEL_CLASS}>
          추천 대상 <span className="text-destructive">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {TARGET_AUDIENCE_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTarget(t)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                values.targetAudience.includes(t)
                  ? "bg-brand-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 focus-visible:bg-muted/80"
              }`}
              aria-pressed={values.targetAudience.includes(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <label htmlFor="evt-custom-target" className="sr-only">직접 입력</label>
        <input
          id="evt-custom-target"
          type="text"
          value={values.customTarget}
          onChange={(e) => onChange({ customTarget: e.target.value })}
          placeholder="직접 입력 (선택)"
          className={`mt-2 ${INPUT_CLASS}`}
        />
      </div>

      {/* 샵 기본 정보 */}
      <div className="rounded-lg border border-input p-4 space-y-3">
        <p className="text-sm font-medium">샵 기본 정보</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="evt-shop-name" className="text-xs text-muted-foreground">샵명</label>
            <input
              id="evt-shop-name"
              type="text"
              value={values.shopName || artistTitle}
              onChange={(e) => onChange({ shopName: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="evt-shop-region" className="text-xs text-muted-foreground">지역</label>
            <input
              id="evt-shop-region"
              type="text"
              value={values.shopRegion}
              onChange={(e) => onChange({ shopRegion: e.target.value })}
              placeholder="서울 강남구"
              className={INPUT_CLASS}
            />
          </div>
        </div>
        <div>
          <label htmlFor="evt-shop-hours" className="text-xs text-muted-foreground">영업시간</label>
          <input
            id="evt-shop-hours"
            type="text"
            value={values.shopBusinessHours}
            onChange={(e) => onChange({ shopBusinessHours: e.target.value })}
            placeholder="10:00 ~ 20:00"
            className={INPUT_CLASS}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="evt-shop-parking" className="text-xs text-muted-foreground">주차</label>
            <input
              id="evt-shop-parking"
              type="text"
              value={values.shopParking}
              onChange={(e) => onChange({ shopParking: e.target.value })}
              placeholder="가능 / 불가"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="evt-shop-booking" className="text-xs text-muted-foreground">예약 방법</label>
            <input
              id="evt-shop-booking"
              type="text"
              value={values.shopBookingMethod}
              onChange={(e) => onChange({ shopBookingMethod: e.target.value })}
              placeholder="카카오톡, 전화"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </div>

      {/* 선택 항목 토글 */}
      <button
        type="button"
        onClick={() => setShowOptional(!showOptional)}
        className="flex w-full items-center justify-between rounded-lg border border-input px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted/50"
        aria-expanded={showOptional}
      >
        <span>추가 정보 입력 (선택)</span>
        <span className="text-lg">{showOptional ? "−" : "+"}</span>
      </button>

      {showOptional && (
        <div className="space-y-4 rounded-lg border border-dashed border-input p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="evt-duration" className={LABEL_CLASS}>시술 시간</label>
              <input
                id="evt-duration"
                type="text"
                value={values.procedureDuration}
                onChange={(e) => onChange({ procedureDuration: e.target.value })}
                placeholder="약 60분"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="evt-maintenance" className={LABEL_CLASS}>유지 기간</label>
              <input
                id="evt-maintenance"
                type="text"
                value={values.maintenancePeriod}
                onChange={(e) => onChange({ maintenancePeriod: e.target.value })}
                placeholder="6개월~1년"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div>
            <p className={LABEL_CLASS}>시술 장점 (최대 3가지)</p>
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                id={`evt-advantage-${i}`}
                type="text"
                value={values.procedureAdvantages[i]}
                onChange={(e) => {
                  const next = [...values.procedureAdvantages] as [string, string, string];
                  next[i] = e.target.value;
                  onChange({ procedureAdvantages: next });
                }}
                placeholder={`장점 ${i + 1}`}
                aria-label={`시술 장점 ${i + 1}`}
                className={`${i > 0 ? "mt-2" : ""} ${INPUT_CLASS}`}
              />
            ))}
          </div>

          <div>
            <label htmlFor="evt-precautions" className={LABEL_CLASS}>시술 후 주의사항</label>
            <textarea
              id="evt-precautions"
              value={values.precautions}
              onChange={(e) => onChange({ precautions: e.target.value })}
              placeholder="예: 시술 직후 색이 진해 보일 수 있어요."
              rows={3}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="evt-artist-intro" className={LABEL_CLASS}>아티스트 소개</label>
            <textarea
              id="evt-artist-intro"
              value={values.artistIntroduction}
              onChange={(e) => onChange({ artistIntroduction: e.target.value })}
              placeholder="예: 자연눈썹과 콤보눈썹을 중심으로 섬세한 디자인을 진행합니다."
              rows={3}
              className={INPUT_CLASS}
            />
          </div>
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
          disabled={!canProceed}
          onClick={onNext}
          className="flex-1 rounded-lg bg-brand-primary py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          다음 단계
        </button>
      </div>
    </div>
  );
}
