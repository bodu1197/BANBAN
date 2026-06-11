import { Check, X } from "lucide-react";

export type ChoiceVisualState = "idle" | "picked" | "correct" | "wrong" | "dim";

const BOX: Record<ChoiceVisualState, string> = {
  idle: "border-border hover:border-brand-primary focus-visible:border-brand-primary",
  picked: "border-brand-primary bg-brand-primary/10",
  correct: "border-emerald-600 bg-emerald-50",
  wrong: "border-rose-600 bg-rose-50",
  dim: "border-border opacity-60",
};
const BADGE: Record<ChoiceVisualState, string> = {
  idle: "bg-muted text-muted-foreground",
  picked: "bg-brand-primary text-white",
  correct: "bg-emerald-600 text-white",
  wrong: "bg-rose-600 text-white",
  dim: "bg-muted text-muted-foreground",
};

/** 학습모드 채점 공개(showResult) 시 정답/오답/흐림, 그 외 선택/기본. */
export function choiceState(showResult: boolean, picked: number | null, answer: number, ci: number): ChoiceVisualState {
  if (showResult) {
    if (ci === answer) return "correct";
    if (ci === picked) return "wrong";
    return "dim";
  }
  return picked === ci ? "picked" : "idle";
}

function badgeMark(state: ChoiceVisualState, index: number): React.ReactNode {
  if (state === "correct") return <Check className="h-3.5 w-3.5" aria-hidden="true" />;
  if (state === "wrong") return <X className="h-3.5 w-3.5" aria-hidden="true" />;
  return index + 1;
}

export function ChoiceButton({ index, label, state, onClick, disabled }: Readonly<{
  index: number;
  label: string;
  state: ChoiceVisualState;
  onClick: () => void;
  disabled?: boolean;
}>): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === "picked"}
      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${BOX[state]}`}
    >
      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-bold ${BADGE[state]}`}>
        {badgeMark(state, index)}
      </span>
      <span className="flex-1 text-[0.95rem] leading-relaxed">{label}</span>
    </button>
  );
}
