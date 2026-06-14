// @client-reason: 위저드 하단 고정 내비게이션 — 단계별 버튼(클릭 핸들러)
"use client";

import { Button } from "@/components/ui/button";

const PRIMARY_BTN = "flex-1 bg-brand-primary py-6 text-base font-semibold text-white hover:bg-brand-primary-hover focus-visible:bg-brand-primary-hover";

function finishLabel(isProcessing: boolean, portfolioCount: number, minRequired: number): string {
  if (isProcessing) return "처리 중…";
  if (portfolioCount < minRequired) return `완료 (작품 ${portfolioCount}/${minRequired})`;
  return "완료";
}

export function WizardFooter({
  step, isProcessing, portfolioCount, minRequired, onPrev, onNext, onCreate, onFinish,
}: Readonly<{
  step: number;
  isProcessing: boolean;
  portfolioCount: number;
  minRequired: number;
  onPrev: () => void;
  onNext: () => void;
  onCreate: () => void;
  onFinish: () => void;
}>): React.ReactElement | null {
  if (step >= 4) return null;
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-4">
      <div className="mx-auto flex max-w-[1024px] items-center gap-3">
        {step === 2 ? (
          <Button type="button" variant="outline" onClick={onPrev} disabled={isProcessing} className="shrink-0">
            이전
          </Button>
        ) : null}

        {step === 1 ? (
          <Button type="button" onClick={onNext} className={PRIMARY_BTN}>
            다음
          </Button>
        ) : null}

        {step === 2 ? (
          <Button type="button" onClick={onCreate} disabled={isProcessing} className={PRIMARY_BTN}>
            {isProcessing ? "샵 생성 중…" : "다음 (샵 생성)"}
          </Button>
        ) : null}

        {step === 3 ? (
          <Button
            type="button"
            onClick={onFinish}
            disabled={isProcessing || portfolioCount < minRequired}
            className={`${PRIMARY_BTN} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {finishLabel(isProcessing, portfolioCount, minRequired)}
          </Button>
        ) : null}
      </div>
    </footer>
  );
}
