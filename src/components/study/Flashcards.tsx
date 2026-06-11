// @client-reason: 카드 플립/셔플/필터 로컬 UI 상태(진도 기록 없음, 읽기 전용 암기)
"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ArrowRight } from "lucide-react";
import { SUBJECTS, SUBJECT_MAP, type SubjectKey } from "@/data/study/question-types";
import { subjectGlyph } from "@/components/study/subject-icon";
import { studyFilterChip, STUDY_PRIMARY_BTN } from "@/components/study/study-styles";

// 카드 렌더에 필요한 필드만(서버에서 추림) — topic/type/source 등 미사용 필드 직렬화 방지.
export interface FlashCard {
  id: string;
  subject: SubjectKey;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
}

type Source = "all" | SubjectKey | "bookmarks";

function shuffle(arr: readonly FlashCard[]): FlashCard[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Flashcards({ allCards, bookmarkIds }: Readonly<{ allCards: FlashCard[]; bookmarkIds: string[] }>): React.ReactElement {
  const bookmarkSet = useMemo(() => new Set(bookmarkIds), [bookmarkIds]);
  const [source, setSource] = useState<Source>("all");
  const [order, setOrder] = useState<FlashCard[]>(allCards); // SSR 안정 순서 → 마운트 후 셔플
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    // 마운트 후 클라에서만 셔플(SSR/클라 불일치 방지) — 의도된 패턴
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrder((o) => shuffle(o));
  }, []);

  function poolFor(s: Source): FlashCard[] {
    if (s === "all") return allCards;
    if (s === "bookmarks") return allCards.filter((q) => bookmarkSet.has(q.id));
    return allCards.filter((q) => q.subject === s);
  }
  function applySource(s: Source): void {
    setSource(s);
    setOrder(shuffle(poolFor(s)));
    setIdx(0);
    setFlipped(false);
  }
  function go(d: number): void {
    const n = idx + d;
    if (n >= 0 && n < order.length) { setIdx(n); setFlipped(false); }
  }

  const total = order.length;
  const cur = order[idx];
  const emptyBookmarks = source === "bookmarks" && bookmarkIds.length === 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => applySource("all")} aria-pressed={source === "all"} className={studyFilterChip(source === "all")}>전체</button>
        {SUBJECTS.map((s) => (
          <button key={s.key} type="button" onClick={() => applySource(s.key)} aria-pressed={source === s.key} className={studyFilterChip(source === s.key)}>{s.label}</button>
        ))}
        <button type="button" onClick={() => applySource("bookmarks")} aria-pressed={source === "bookmarks"} className={studyFilterChip(source === "bookmarks")}>북마크</button>
      </div>

      {total === 0 || !cur ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {emptyBookmarks ? "북마크한 문제가 없습니다. 문제를 북마크하면 카드로 복습할 수 있어요." : "카드가 없습니다."}
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">{idx + 1} / {total}</span>
            <button type="button" onClick={() => { setOrder((o) => shuffle(o)); setIdx(0); setFlipped(false); }} className="inline-flex items-center gap-1 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> 섞기
            </button>
          </div>
          <FlashcardCard card={cur} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
          <div className="mt-4 flex items-center gap-2.5">
            <button type="button" onClick={() => go(-1)} disabled={idx === 0} className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40">이전</button>
            <button type="button" onClick={() => setFlipped((f) => !f)} className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">뒤집기</button>
            <button type="button" onClick={() => go(1)} disabled={idx >= total - 1} className={`inline-flex items-center gap-1.5 px-4 py-3 ${STUDY_PRIMARY_BTN} disabled:opacity-40`}>다음 <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </>
      )}
    </div>
  );
}

function FlashcardCard({ card, flipped, onFlip }: Readonly<{ card: FlashCard; flipped: boolean; onFlip: () => void }>): React.ReactElement {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFlip}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFlip(); } }}
      aria-label={flipped ? "문제 보기" : "정답·해설 보기"}
      className="flex min-h-[220px] w-full cursor-pointer flex-col justify-center rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-colors hover:border-brand-primary focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="mb-3 inline-flex items-center gap-1.5 self-start rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {subjectGlyph(card.subject, "h-3.5 w-3.5")} {SUBJECT_MAP[card.subject].label}
      </span>
      {flipped ? (
        <>
          <p className="text-sm font-bold text-emerald-600">정답 {card.answer + 1}. {card.choices[card.answer]}</p>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{card.explanation}</p>
        </>
      ) : (
        <>
          <p className="text-[1.05rem] font-medium leading-relaxed">{card.question}</p>
          {card.choices.length > 0 ? (
            <ol className="mt-4 space-y-2">
              {card.choices.map((c, i) => (
                <li key={i} className="flex gap-2 text-[0.95rem]"><span className="shrink-0 tabular-nums text-muted-foreground">{i + 1}.</span><span>{c}</span></li>
              ))}
            </ol>
          ) : null}
          <p className="mt-4 text-xs text-muted-foreground">카드를 눌러 정답·해설 보기</p>
        </>
      )}
    </div>
  );
}
