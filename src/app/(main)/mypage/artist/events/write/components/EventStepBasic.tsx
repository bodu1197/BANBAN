// @client-reason: Form inputs with controlled state for step 1
"use client";

import {
  EVENT_CATEGORIES,
  RETOUCH_TYPES,
  type EventFormValues,
} from "@/components/event-form/types";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/event-form/form-styles";
import { calcDiscountRate } from "@/components/portfolio-form/portfolio-helpers";

export function EventStepBasic({
  values,
  onChange,
  onNext,
}: Readonly<{
  values: EventFormValues;
  onChange: (updates: Partial<EventFormValues>) => void;
  onNext: () => void;
}>): React.ReactElement {
  const priceNum = Number(values.price) || 0;
  const priceOriginNum = Number(values.priceOrigin) || 0;
  const discountRate = calcDiscountRate(priceNum, priceOriginNum);

  const canProceed =
    values.category !== "" &&
    values.procedureName.trim() !== "" &&
    values.title.trim() !== "" &&
    priceOriginNum > 0 &&
    priceNum > 0;

  return (
    <div className="space-y-5">
      {/* 시술 카테고리 */}
      <div>
        <p className={LABEL_CLASS}>
          시술 카테고리 <span className="text-destructive">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {EVENT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onChange({ category: cat })}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                values.category === cat
                  ? "bg-brand-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 focus-visible:bg-muted/80"
              }`}
              aria-pressed={values.category === cat}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 시술명 */}
      <div>
        <label htmlFor="evt-procedure-name" className={LABEL_CLASS}>
          이벤트 시술명 <span className="text-destructive">*</span>
        </label>
        <input
          id="evt-procedure-name"
          type="text"
          value={values.procedureName}
          onChange={(e) => onChange({ procedureName: e.target.value })}
          placeholder="예: 자연눈썹, 콤보눈썹, 입술톤업"
          className={INPUT_CLASS}
        />
      </div>

      {/* 이벤트 제목 */}
      <div>
        <label htmlFor="evt-title" className={LABEL_CLASS}>
          이벤트 제목 <span className="text-destructive">*</span>
        </label>
        <input
          id="evt-title"
          type="text"
          value={values.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="예: 자연스러운 데일리 눈썹 이벤트"
          className={INPUT_CLASS}
        />
      </div>

      {/* 가격 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="evt-price-origin" className={LABEL_CLASS}>
            일반가 <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              id="evt-price-origin"
              type="number"
              inputMode="numeric"
              value={values.priceOrigin}
              onChange={(e) => onChange({ priceOrigin: e.target.value })}
              placeholder="250000"
              className={INPUT_CLASS}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              원
            </span>
          </div>
        </div>
        <div>
          <label htmlFor="evt-price" className={LABEL_CLASS}>
            이벤트가 <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              id="evt-price"
              type="number"
              inputMode="numeric"
              value={values.price}
              onChange={(e) => onChange({ price: e.target.value })}
              placeholder="150000"
              className={INPUT_CLASS}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              원
            </span>
          </div>
        </div>
      </div>

      {/* 할인율 배지 */}
      {discountRate > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-950/30">
          <span className="rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            {discountRate}% OFF
          </span>
          <span className="text-sm text-muted-foreground line-through">
            {priceOriginNum.toLocaleString()}원
          </span>
          <span className="text-sm font-bold text-foreground">
            {priceNum.toLocaleString()}원
          </span>
        </div>
      )}

      {/* 리터치/추가비 */}
      <div>
        <p className={LABEL_CLASS}>리터치 / 추가비 안내</p>
        <div className="flex flex-wrap gap-2">
          {RETOUCH_TYPES.map((rt) => (
            <button
              key={rt.value}
              type="button"
              onClick={() => onChange({ retouchType: rt.value })}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                values.retouchType === rt.value
                  ? "bg-brand-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 focus-visible:bg-muted/80"
              }`}
              aria-pressed={values.retouchType === rt.value}
            >
              {rt.label}
            </button>
          ))}
        </div>
        {(values.retouchType === "separate" || values.retouchType === "extra") && (
          <>
            <label htmlFor="evt-retouch-desc" className="sr-only">추가비 설명</label>
            <input
              id="evt-retouch-desc"
              type="text"
              value={values.retouchDescription}
              onChange={(e) => onChange({ retouchDescription: e.target.value })}
              placeholder="예: 리터치 1회 포함, 색상 변경 시 추가비 발생"
              className={`mt-2 ${INPUT_CLASS}`}
            />
          </>
        )}
      </div>

      <button
        type="button"
        disabled={!canProceed}
        onClick={onNext}
        className="w-full rounded-lg bg-brand-primary py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
      >
        다음 단계
      </button>
    </div>
  );
}
