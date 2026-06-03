// @client-reason: Controlled inputs for event detail fields
"use client";

import { TARGET_AUDIENCE_OPTIONS, EVENT_FIELD_LIMITS, type EventFormValues } from "@/components/event-form/types";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/event-form/form-styles";

function TargetAudienceField({
  values,
  onChange,
}: Readonly<{
  values: EventFormValues;
  onChange: (u: Partial<EventFormValues>) => void;
}>): React.ReactElement {
  const toggleTarget = (t: string): void => {
    const next = values.targetAudience.includes(t)
      ? values.targetAudience.filter((x) => x !== t)
      : [...values.targetAudience, t];
    onChange({ targetAudience: next });
  };

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className={LABEL_CLASS}>
        추천 대상 <span className="text-destructive">*</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {TARGET_AUDIENCE_OPTIONS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toggleTarget(t)}
            className={`min-h-[44px] rounded-full px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
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
      <label htmlFor="edit-custom-target" className="sr-only">직접 입력</label>
      <input
        id="edit-custom-target"
        type="text"
        value={values.customTarget}
        onChange={(e) => onChange({ customTarget: e.target.value })}
        maxLength={EVENT_FIELD_LIMITS.target_audience_item}
        placeholder="직접 입력 (선택)"
        className={`mt-2 ${INPUT_CLASS}`}
      />
    </fieldset>
  );
}

 
function ShopInfoFieldset({
  values,
  onChange,
  artistTitle,
}: Readonly<{
  values: EventFormValues;
  onChange: (u: Partial<EventFormValues>) => void;
  artistTitle: string;
}>): React.ReactElement {
  return (
    <fieldset className="rounded-lg border border-input p-4 space-y-3">
      <legend className="text-sm font-medium px-1">샵 기본 정보</legend>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="edit-shop-name" className="text-xs text-muted-foreground">샵명</label>
          <input
            id="edit-shop-name"
            type="text"
            value={values.shopName}
            onChange={(e) => onChange({ shopName: e.target.value })}
            maxLength={EVENT_FIELD_LIMITS.shop_name}
            placeholder={artistTitle}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="edit-shop-region" className="text-xs text-muted-foreground">지역</label>
          <input
            id="edit-shop-region"
            type="text"
            value={values.shopRegion}
            onChange={(e) => onChange({ shopRegion: e.target.value })}
            maxLength={EVENT_FIELD_LIMITS.shop_region}
            placeholder="서울 강남구"
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div>
        <label htmlFor="edit-shop-hours" className="text-xs text-muted-foreground">영업시간</label>
        <input
          id="edit-shop-hours"
          type="text"
          value={values.shopBusinessHours}
          onChange={(e) => onChange({ shopBusinessHours: e.target.value })}
          maxLength={EVENT_FIELD_LIMITS.shop_business_hours}
          placeholder="10:00 ~ 20:00"
          className={INPUT_CLASS}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="edit-shop-parking" className="text-xs text-muted-foreground">주차</label>
          <input
            id="edit-shop-parking"
            type="text"
            value={values.shopParking}
            onChange={(e) => onChange({ shopParking: e.target.value })}
            maxLength={EVENT_FIELD_LIMITS.shop_parking}
            placeholder="가능 / 불가"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="edit-shop-booking" className="text-xs text-muted-foreground">예약 방법</label>
          <input
            id="edit-shop-booking"
            type="text"
            value={values.shopBookingMethod}
            onChange={(e) => onChange({ shopBookingMethod: e.target.value })}
            maxLength={EVENT_FIELD_LIMITS.shop_booking_method}
            placeholder="카카오톡, 전화"
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </fieldset>
  );
}

 
export function EditDetailsSection({
  values,
  onChange,
  artistTitle,
}: Readonly<{
  values: EventFormValues;
  onChange: (u: Partial<EventFormValues>) => void;
  artistTitle: string;
}>): React.ReactElement {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">상세 정보</h2>

      <div>
        <label htmlFor="edit-period-text" className={LABEL_CLASS}>이벤트 기간</label>
        <input
          id="edit-period-text"
          type="text"
          value={values.eventPeriodText}
          onChange={(e) => onChange({ eventPeriodText: e.target.value })}
          maxLength={EVENT_FIELD_LIMITS.event_period_text}
          placeholder="예: 2026년 6월 30일까지, 선착순 20명"
          className={INPUT_CLASS}
        />
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div>
            <label htmlFor="edit-start-at" className="text-xs text-muted-foreground">시작일</label>
            <input
              id="edit-start-at"
              type="date"
              value={values.eventStartAt}
              onChange={(e) => onChange({ eventStartAt: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="edit-end-at" className="text-xs text-muted-foreground">종료일</label>
            <input
              id="edit-end-at"
              type="date"
              value={values.eventEndAt}
              onChange={(e) => onChange({ eventEndAt: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="edit-summary" className={LABEL_CLASS}>
          시술 한 줄 소개 <span className="text-destructive">*</span>
        </label>
        <input
          id="edit-summary"
          type="text"
          value={values.procedureSummary}
          onChange={(e) => onChange({ procedureSummary: e.target.value })}
          maxLength={100}
          className={INPUT_CLASS}
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {values.procedureSummary.length}/100
        </p>
      </div>

      <TargetAudienceField values={values} onChange={onChange} />
      <ShopInfoFieldset values={values} onChange={onChange} artistTitle={artistTitle} />
    </section>
  );
}
