// @client-reason: Controlled inputs for basic event fields
"use client";

import { RETOUCH_TYPES, type EventFormValues } from "@/components/event-form/types";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/event-form/form-styles";
import { calcDiscountRate } from "@/components/portfolio-form/portfolio-helpers";

// eslint-disable-next-line max-lines-per-function -- form section with price inputs + discount badge
function PriceFields({
  values,
  onChange,
}: Readonly<{
  values: EventFormValues;
  onChange: (u: Partial<EventFormValues>) => void;
}>): React.ReactElement {
  const priceNum = Number(values.price) || 0;
  const priceOriginNum = Number(values.priceOrigin) || 0;
  const discountRate = calcDiscountRate(priceNum, priceOriginNum);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="edit-price-origin" className={LABEL_CLASS}>
            일반가 <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              id="edit-price-origin"
              type="number"
              inputMode="numeric"
              value={values.priceOrigin}
              onChange={(e) => onChange({ priceOrigin: e.target.value })}
              className={INPUT_CLASS}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
          </div>
        </div>
        <div>
          <label htmlFor="edit-price" className={LABEL_CLASS}>
            이벤트가 <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              id="edit-price"
              type="number"
              inputMode="numeric"
              value={values.price}
              onChange={(e) => onChange({ price: e.target.value })}
              className={INPUT_CLASS}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
          </div>
        </div>
      </div>

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
    </>
  );
}

function RetouchField({
  values,
  onChange,
}: Readonly<{
  values: EventFormValues;
  onChange: (u: Partial<EventFormValues>) => void;
}>): React.ReactElement {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className={LABEL_CLASS}>리터치 / 추가비 안내</legend>
      <div className="flex flex-wrap gap-2">
        {RETOUCH_TYPES.map((rt) => (
          <button
            key={rt.value}
            type="button"
            onClick={() => onChange({ retouchType: rt.value })}
            className={`min-h-[44px] rounded-full px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
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
          <label htmlFor="edit-retouch-desc" className="sr-only">추가비 설명</label>
          <input
            id="edit-retouch-desc"
            type="text"
            value={values.retouchDescription}
            onChange={(e) => onChange({ retouchDescription: e.target.value })}
            placeholder="예: 리터치 1회 포함, 색상 변경 시 추가비 발생"
            className={`mt-2 ${INPUT_CLASS}`}
          />
        </>
      )}
    </fieldset>
  );
}

export function EditBasicSection({
  values,
  onChange,
}: Readonly<{
  values: EventFormValues;
  onChange: (u: Partial<EventFormValues>) => void;
}>): React.ReactElement {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">기본 정보</h2>

      <div>
        <label htmlFor="edit-procedure-name" className={LABEL_CLASS}>
          시술명 <span className="text-destructive">*</span>
        </label>
        <input
          id="edit-procedure-name"
          type="text"
          value={values.procedureName}
          onChange={(e) => onChange({ procedureName: e.target.value })}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="edit-title" className={LABEL_CLASS}>
          이벤트 제목 <span className="text-destructive">*</span>
        </label>
        <input
          id="edit-title"
          type="text"
          value={values.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className={INPUT_CLASS}
        />
      </div>

      <PriceFields values={values} onChange={onChange} />
      <RetouchField values={values} onChange={onChange} />
    </section>
  );
}
