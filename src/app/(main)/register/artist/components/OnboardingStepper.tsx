// @client-reason: 진행 단계 시각 표시 — 부모(위저드)의 현재 단계 상태에 따라 렌더(상호작용 없음)
"use client";

import { Check } from "lucide-react";

export interface OnboardingStep {
  id: number;
  label: string;
}

function circleClass(isDone: boolean, isCurrent: boolean): string {
  if (isDone) return "border-brand-primary bg-brand-primary text-white";
  if (isCurrent) return "border-brand-primary bg-brand-primary/10 text-brand-primary";
  return "border-border bg-background text-muted-foreground";
}

function labelClass(isDone: boolean, isCurrent: boolean): string {
  if (isCurrent) return "font-semibold text-brand-primary";
  if (isDone) return "font-medium text-foreground";
  return "text-muted-foreground";
}

/**
 * 아티스트 등록 위저드 상단 진행탭. 현재 단계까지 채워진 진행바 + 단계 라벨.
 * 클릭 이동은 제공하지 않는다(②에서 샵 생성 후 ①②로 되돌아가면 데이터 모순) — 순수 진행 표시.
 */
export function OnboardingStepper({ current, steps }: Readonly<{
  current: number;
  steps: readonly OnboardingStep[];
}>): React.ReactElement {
  return (
    <nav aria-label="등록 진행 단계" className="border-b bg-background px-4 py-3">
      <ol className="mx-auto flex max-w-[420px] items-start">
        {steps.map((step, i) => {
          const isDone = step.id < current;
          const isCurrent = step.id === current;
          const circleStyle = circleClass(isDone, isCurrent);
          const labelStyle = labelClass(isDone, isCurrent);
          return (
            <li key={step.id} className="relative flex flex-1 flex-col items-center">
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${step.id <= current ? "bg-brand-primary" : "bg-border"}`}
                />
              ) : null}
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${circleStyle}`}
              >
                {/* 색만이 아니라 텍스트/아이콘으로도 상태 전달(WCAG 1.4.1 색 의존 금지) */}
                {isDone ? <Check className="h-4 w-4" aria-hidden="true" /> : step.id}
                {isDone ? <span className="sr-only">(완료)</span> : null}
                {isCurrent ? <span className="sr-only">(현재 단계)</span> : null}
              </span>
              <span className={`mt-1 text-center text-xs ${labelStyle}`}>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
