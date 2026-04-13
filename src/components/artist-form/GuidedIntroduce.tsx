// @client-reason: Interactive Q&A form with live character count and progress bar
"use client";

import { useState, useCallback, useMemo } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Pencil } from "lucide-react";

const MIN_LENGTH = 100;

interface Question {
  id: string;
  label: string;
  placeholder: string;
}

const QUESTIONS: Question[] = [
  {
    id: "specialty",
    label: "어떤 시술을 전문으로 하시나요?",
    placeholder: "예: 자연 눈썹, 콤보 눈썹, 입술 틴트, 아이라인 등",
  },
  {
    id: "experience",
    label: "경력은 얼마나 되셨나요?",
    placeholder: "예: 반영구 전문 5년차, 수료 기관, 자격증 등",
  },
  {
    id: "style",
    label: "시술 스타일이나 강점은 무엇인가요?",
    placeholder: "예: 자연스러운 결 표현, 통증 최소화, 꼼꼼한 상담 등",
  },
  {
    id: "message",
    label: "고객에게 한마디!",
    placeholder: "예: 편하게 상담 먼저 받아보세요, 만족하실 때까지 책임집니다 등",
  },
];

type Answers = { [key: string]: string | undefined };

function buildIntroduce(answers: Answers): string {
  return QUESTIONS
    .map((q) => answers[q.id]?.trim() ?? "")
    .filter(Boolean)
    .join("\n");
}

function ProgressBar({ current, target }: Readonly<{ current: number; target: number }>): React.ReactElement {
  const ratio = Math.min(current / target, 1);
  const percent = Math.round(ratio * 100);
  const done = current >= target;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className={done ? "font-medium text-green-500" : "text-muted-foreground"}>
          {done ? "달성 완료!" : `${target - current}자 더 작성해 주세요`}
        </span>
        <span className={done ? "font-semibold text-green-500" : "font-medium text-foreground"}>
          {current} / {target}자
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-300 ${done ? "bg-green-500" : "bg-brand-primary"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

interface GuidedIntroduceProps {
  value: string;
  onChange: (value: string) => void;
}

export function GuidedIntroduce({ value, onChange }: Readonly<GuidedIntroduceProps>): React.ReactElement {
  const [answers, setAnswers] = useState<Answers>(() =>
    value.trim() ? { _freeform: value } : {},
  );
  const [isEditing, setIsEditing] = useState(false);
  const [expandedQ, setExpandedQ] = useState<string>(QUESTIONS[0].id);

  const combined = useMemo(() => {
    if (answers._freeform !== undefined) return answers._freeform;
    return buildIntroduce(answers);
  }, [answers]);

  const charCount = combined.length;

  const handleAnswerChange = useCallback((questionId: string, text: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: text };
      delete next._freeform;
      const result = buildIntroduce(next);
      onChange(result);
      return next;
    });
  }, [onChange]);

  const handleFreeformChange = useCallback((text: string) => {
    setAnswers({ _freeform: text });
    onChange(text);
  }, [onChange]);

  const switchToFreeform = useCallback(() => {
    setIsEditing(true);
    if (!answers._freeform) {
      const merged = buildIntroduce(answers);
      setAnswers({ _freeform: merged });
    }
  }, [answers]);

  const switchToGuided = useCallback(() => {
    setIsEditing(false);
    // If coming from freeform, keep the text but move to first Q
    if (answers._freeform !== undefined) {
      setAnswers({ [QUESTIONS[0].id]: answers._freeform });
      onChange(answers._freeform);
    }
  }, [answers, onChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          소개글 <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={isEditing ? switchToGuided : switchToFreeform}
          className="flex items-center gap-1.5 text-sm font-semibold text-brand-primary transition-colors hover:text-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded"
        >
          <Pencil className="h-4 w-4" />
          {isEditing ? "가이드 모드" : "직접 작성"}
        </button>
      </div>

      {isEditing ? (
        <textarea
          value={answers._freeform ?? ""}
          onChange={(e) => handleFreeformChange(e.target.value)}
          placeholder="소개글을 자유롭게 작성해 주세요 (100자 이상)"
          rows={6}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">질문에 답하면 소개글이 자동으로 완성됩니다</p>
          {QUESTIONS.map((q) => {
            const isOpen = expandedQ === q.id;
            const answered = (answers[q.id] ?? "").trim().length > 0;
            return (
              <div key={q.id} className="rounded-lg border border-border bg-background">
                <button
                  type="button"
                  onClick={() => setExpandedQ(isOpen ? "" : q.id)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  {answered
                    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    : <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground text-[10px] text-muted-foreground">{QUESTIONS.indexOf(q) + 1}</span>
                  }
                  <span className="flex-1">{q.label}</span>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isOpen && (
                  <div className="px-3 pb-3">
                    <textarea
                      value={answers[q.id] ?? ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder={q.placeholder}
                      rows={2}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ProgressBar current={charCount} target={MIN_LENGTH} />

      {charCount > 0 && !isEditing && (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">미리보기</p>
          <p className="whitespace-pre-line text-sm text-foreground">{combined}</p>
        </div>
      )}
    </div>
  );
}

export const INTRODUCE_MIN_LENGTH = MIN_LENGTH;
