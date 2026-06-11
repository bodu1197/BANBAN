// @client-reason: 인터뷰 Q&A 폼 — 실시간 글자수, 자유작성칸, AI 맞춤법 교정(인터랙션 기반)
"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";
import type { IntroduceQA } from "@/types/artist-form";
import { deriveIntroduceText } from "@/types/artist-form";

const MIN_LENGTH = 100;
const FREE_ID = "_free";

interface Question {
  id: string;
  label: string;
  placeholder: string;
}

const QUESTIONS: Question[] = [
  { id: "specialty", label: "어떤 시술을 전문으로 하시나요?", placeholder: "예: 자연 눈썹, 콤보 눈썹, 입술 틴트, 아이라인 등" },
  { id: "experience", label: "경력은 얼마나 되셨나요?", placeholder: "예: 반영구 전문 5년차, 수료 기관, 보유 자격증 등" },
  { id: "style", label: "시술 스타일이나 강점은 무엇인가요?", placeholder: "예: 자연스러운 결 표현, 통증 최소화, 꼼꼼한 상담 등" },
  { id: "philosophy", label: "시술할 때 가장 중요하게 생각하는 것은?", placeholder: "예: 얼굴형 맞춤 디자인, 철저한 위생, 사후관리 등" },
  { id: "atmosphere", label: "샵 분위기를 한 단어로 표현하면?", placeholder: "예: 모던 / 내추럴 / 프라이빗 / 럭셔리 / 감성" },
  { id: "differentiate", label: "다른 샵과 차별화된 점이 있다면?", placeholder: "예: 1:1 맞춤 상담, 무통 마취, 당일 예약 가능 등" },
  { id: "customer_type", label: "어떤 고객분들이 주로 찾아오시나요?", placeholder: "예: 20~30대 직장인, 자연스러운 눈썹을 원하는 분 등" },
  { id: "after_care", label: "사후관리는 어떻게 진행하시나요?", placeholder: "예: 리터치 1회 무료, 카톡 상담, 관리 가이드 제공 등" },
  { id: "message", label: "고객에게 한마디!", placeholder: "예: 편하게 상담 먼저 받아보세요, 만족하실 때까지 책임집니다 등" },
];

// Map<questionId|FREE_ID, 답변> — 동적 객체 키(prototype pollution) 회피용으로 Map 사용.
type Answers = Map<string, string>;

function buildQA(answers: Answers): IntroduceQA {
  const qa = QUESTIONS
    .map((q) => ({ id: q.id, q: q.label, a: (answers.get(q.id) ?? "").trim() }))
    .filter((item) => item.a.length > 0);
  return { qa, free: (answers.get(FREE_ID) ?? "").trim() };
}

function initAnswers(initial: IntroduceQA | null, initialText: string): Answers {
  const map: Answers = new Map();
  if (initial) {
    for (const item of initial.qa) map.set(item.id, item.a);
    map.set(FREE_ID, initial.free);
    return map;
  }
  // 레거시(introduce_qa 없음): 기존 평문을 자유칸으로 보존.
  if (initialText.trim()) map.set(FREE_ID, initialText);
  return map;
}

function ProgressBar({ current, target }: Readonly<{ current: number; target: number }>): React.ReactElement {
  const ratio = Math.min(current / target, 1);
  const percent = Math.round(ratio * 100);
  const done = current >= target;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className={done ? "font-medium text-green-600" : "text-muted-foreground"}>
          {done ? "달성 완료!" : `${target - current}자 더 작성해 주세요`}
        </span>
        <span className={done ? "font-semibold text-green-600" : "font-medium text-foreground"}>
          {current} / {target}자
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        {/* style unavoidable: dynamic percentage from runtime data */}
        <div
          className={`h-full rounded-full transition-all duration-300 ${done ? "bg-green-500" : "bg-brand-primary"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function IntroduceHeader({ onCorrect, correcting, hasContent }: Readonly<{
  onCorrect: () => void;
  correcting: boolean;
  hasContent: boolean;
}>): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium">
        소개글 <span className="text-red-500">*</span>
      </label>
      <button
        type="button"
        onClick={onCorrect}
        disabled={correcting || !hasContent}
        aria-label="AI 맞춤법 다듬기"
        className="flex items-center gap-1.5 rounded text-sm font-semibold text-brand-primary transition-colors hover:text-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
      >
        {correcting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
        {correcting ? "다듬는 중..." : "맞춤법 다듬기"}
      </button>
    </div>
  );
}

function QuestionAccordion({ answers, expandedQ, onExpandToggle, onAnswerChange }: Readonly<{
  answers: Answers;
  expandedQ: string;
  onExpandToggle: (id: string) => void;
  onAnswerChange: (questionId: string, text: string) => void;
}>): React.ReactElement {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">질문에 답하면 소개글이 완성됩니다. 답한 그대로 샵 페이지에 Q&amp;A 카드로 보여집니다.</p>
      {QUESTIONS.map((q, idx) => {
        const isOpen = expandedQ === q.id;
        const value = answers.get(q.id) ?? "";
        const answered = value.trim().length > 0;
        return (
          <div key={q.id} className="rounded-lg border border-border bg-background">
            <button
              type="button"
              onClick={() => onExpandToggle(q.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              {answered
                ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                : <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground text-[10px] text-muted-foreground">{idx + 1}</span>}
              <span className="flex-1">{q.label}</span>
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            </button>
            {isOpen && (
              <div className="px-3 pb-3">
                <textarea
                  value={value}
                  onChange={(e) => onAnswerChange(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  aria-label={q.label}
                  rows={2}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FreeWriteField({ value, onChange }: Readonly<{
  value: string;
  onChange: (text: string) => void;
}>): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <label htmlFor="introduce-free" className="text-sm font-medium text-muted-foreground">
        마지막으로, 자유롭게 하고 싶은 말 <span className="text-xs font-normal">(선택)</span>
      </label>
      <textarea
        id="introduce-free"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="위 질문에 담지 못한 이야기를 자유롭게 적어주세요. 적은 그대로 소개글에 더해집니다."
        rows={4}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

interface GuidedIntroduceProps {
  initial: IntroduceQA | null;
  initialText: string;
  onChange: (qa: IntroduceQA, derivedText: string) => void;
}

export function GuidedIntroduce({ initial, initialText, onChange }: Readonly<GuidedIntroduceProps>): React.ReactElement {
  const [answers, setAnswers] = useState<Answers>(() => initAnswers(initial, initialText));
  const [expandedQ, setExpandedQ] = useState<string>(QUESTIONS[0].id);
  const [correcting, setCorrecting] = useState(false);
  // 비동기 AI 교정 중 사용자 입력과의 레이스 방지 — 항상 '최신' answers 를 ref 로 추적.
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const charCount = useMemo(() => deriveIntroduceText(buildQA(answers)).length, [answers]);

  const commit = useCallback((next: Answers): void => {
    setAnswers(next);
    const qa = buildQA(next);
    onChange(qa, deriveIntroduceText(qa));
  }, [onChange]);

  const handleAnswerChange = useCallback((id: string, text: string): void => {
    commit(new Map(answersRef.current).set(id, text));
  }, [commit]);

  const handleCorrect = useCallback(async (): Promise<void> => {
    const base = answersRef.current;
    const items = [...QUESTIONS.map((q) => ({ id: q.id, text: base.get(q.id) ?? "" })), { id: FREE_ID, text: base.get(FREE_ID) ?? "" }]
      .filter((it) => it.text.trim().length > 0);
    if (items.length === 0) return;
    setCorrecting(true);
    try {
      const res = await fetch("/api/ai/correct-introduce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        const data = await res.json() as { items: { id: string; text: string }[] };
        // 교정 중 사용자가 다른 칸을 수정했을 수 있어 '최신' answers 위에 교정 결과를 머지(입력 유실 방지).
        const next = new Map(answersRef.current);
        for (const it of data.items) next.set(it.id, it.text);
        commit(next);
      }
    } catch {
      /* 교정 실패 — 원문 유지 */
    } finally {
      setCorrecting(false);
    }
  }, [commit]);

  return (
    <div className="space-y-4">
      <IntroduceHeader onCorrect={() => void handleCorrect()} correcting={correcting} hasContent={charCount > 0} />
      <QuestionAccordion
        answers={answers}
        expandedQ={expandedQ}
        onExpandToggle={(id) => setExpandedQ(expandedQ === id ? "" : id)}
        onAnswerChange={handleAnswerChange}
      />
      <FreeWriteField value={answers.get(FREE_ID) ?? ""} onChange={(t) => handleAnswerChange(FREE_ID, t)} />
      <ProgressBar current={charCount} target={MIN_LENGTH} />
    </div>
  );
}

export const INTRODUCE_MIN_LENGTH = MIN_LENGTH;
