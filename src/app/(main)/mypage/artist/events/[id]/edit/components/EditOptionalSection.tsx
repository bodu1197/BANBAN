// @client-reason: Collapsible optional field inputs for event edit
"use client";

import { useState } from "react";
import type { EventFormValues } from "@/components/event-form/types";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/event-form/form-styles";

function AdvantageInput({
  index,
  values,
  onChange,
  className,
}: Readonly<{
  index: 0 | 1 | 2;
  values: EventFormValues;
  onChange: (u: Partial<EventFormValues>) => void;
  className?: string;
}>): React.ReactElement {
  const advArr = values.procedureAdvantages;
  let val = advArr[2];
  if (index === 0) val = advArr[0];
  else if (index === 1) val = advArr[1];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const updated: [string, string, string] = [advArr[0], advArr[1], advArr[2]];
    if (index === 0) updated[0] = e.target.value;
    else if (index === 1) updated[1] = e.target.value;
    else updated[2] = e.target.value;
    onChange({ procedureAdvantages: updated });
  };

  return (
    <input
      id={`edit-advantage-${String(index)}`}
      type="text"
      value={val}
      onChange={handleChange}
      placeholder={`장점 ${String(index + 1)}`}
      aria-label={`시술 장점 ${String(index + 1)}`}
      className={`${className ?? ""} ${INPUT_CLASS}`.trim()}
    />
  );
}

export function EditOptionalSection({
  values,
  onChange,
}: Readonly<{
  values: EventFormValues;
  onChange: (u: Partial<EventFormValues>) => void;
}>): React.ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-input px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted/50"
        aria-expanded={open}
        aria-label={open ? "추가 정보 숨기기" : "추가 정보 보기"}
      >
        <span>추가 정보 (선택)</span>
        <span className="text-lg">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <section className="space-y-4 rounded-lg border border-dashed border-input p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-duration" className={LABEL_CLASS}>시술 시간</label>
              <input
                id="edit-duration"
                type="text"
                value={values.procedureDuration}
                onChange={(e) => onChange({ procedureDuration: e.target.value })}
                placeholder="약 60분"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="edit-maintenance" className={LABEL_CLASS}>유지 기간</label>
              <input
                id="edit-maintenance"
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
            <AdvantageInput index={0} values={values} onChange={onChange} />
            <AdvantageInput index={1} values={values} onChange={onChange} className="mt-2" />
            <AdvantageInput index={2} values={values} onChange={onChange} className="mt-2" />
          </div>

          <div>
            <label htmlFor="edit-precautions" className={LABEL_CLASS}>시술 후 주의사항</label>
            <textarea
              id="edit-precautions"
              value={values.precautions}
              onChange={(e) => onChange({ precautions: e.target.value })}
              placeholder="예: 시술 직후 색이 진해 보일 수 있어요."
              rows={3}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="edit-artist-intro" className={LABEL_CLASS}>아티스트 소개</label>
            <textarea
              id="edit-artist-intro"
              value={values.artistIntroduction}
              onChange={(e) => onChange({ artistIntroduction: e.target.value })}
              placeholder="예: 자연눈썹과 콤보눈썹을 중심으로 섬세한 디자인을 진행합니다."
              rows={3}
              className={INPUT_CLASS}
            />
          </div>
        </section>
      )}
    </>
  );
}
