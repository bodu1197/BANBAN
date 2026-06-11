// @client-reason: 키워드/과목/난이도 즉시 필터(QUESTIONS 미import — 서버 SearchDoc props)
"use client";

import { useMemo, useState } from "react";
import { SUBJECT_MAP, SUBJECTS, type SubjectKey } from "@/data/study/question-types";
import { BookmarkButton } from "@/components/study/BookmarkButton";
import { subjectGlyph } from "@/components/study/subject-icon";
import { STUDY_INPUT, studyFilterChip } from "@/components/study/study-styles";

export interface SearchDoc {
  id: string;
  subject: SubjectKey;
  difficulty: number;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
}

const DIFF_LABEL = ["", "하", "중", "상"]; // index = difficulty(1~3)
const MAX_RESULTS = 100;

export function SearchView({ docs, initialSubjects, bookmarkIds, fromPart }: Readonly<{ docs: SearchDoc[]; initialSubjects: SubjectKey[]; bookmarkIds: string[]; fromPart: boolean }>): React.ReactElement {
  const bookmarkSet = useMemo(() => new Set(bookmarkIds), [bookmarkIds]);
  const [keyword, setKeyword] = useState("");
  const [subjects, setSubjects] = useState<SubjectKey[]>(initialSubjects);
  const [diffs, setDiffs] = useState<number[]>([]);

  // URL 쿼리(initialSubjects prop) 변경 시 필터 재동기화 — React 19 렌더 중 조정 패턴.
  const [syncedFrom, setSyncedFrom] = useState(initialSubjects);
  if (syncedFrom !== initialSubjects) {
    setSyncedFrom(initialSubjects);
    setSubjects(initialSubjects);
  }

  const results = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return docs.filter((q) => {
      if (subjects.length && !subjects.includes(q.subject)) return false;
      if (diffs.length && !diffs.includes(q.difficulty)) return false;
      if (kw) return `${q.question} ${q.choices.join(" ")} ${q.explanation}`.toLowerCase().includes(kw);
      return true;
    });
  }, [docs, keyword, subjects, diffs]);

  function toggleSubject(k: SubjectKey): void {
    setSubjects((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  }
  function toggleDiff(d: number): void {
    setDiffs((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  return (
    <div>
      {fromPart ? <p className="mb-3 text-xs text-muted-foreground">교과서 단원과 연결된 과목으로 필터링했습니다.</p> : null}

      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="키워드로 검색 (문제·보기·해설)" aria-label="문제 검색" className={STUDY_INPUT} />

      <div className="mt-3 flex flex-wrap gap-2">
        {SUBJECTS.map((s) => (
          <button key={s.key} type="button" onClick={() => toggleSubject(s.key)} aria-pressed={subjects.includes(s.key)} className={studyFilterChip(subjects.includes(s.key))}>{s.label}</button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {[1, 2, 3].map((d) => (
          <button key={d} type="button" onClick={() => toggleDiff(d)} aria-pressed={diffs.includes(d)} className={studyFilterChip(diffs.includes(d))}>난이도 {DIFF_LABEL[d]}</button>
        ))}
      </div>

      <p className="mb-3 mt-4 text-sm text-muted-foreground">총 <b className="text-foreground tabular-nums">{results.length}</b>문항</p>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">조건에 맞는 문항이 없습니다. 검색어나 필터를 바꿔보세요.</div>
      ) : (
        <ul className="space-y-2.5">
          {results.slice(0, MAX_RESULTS).map((q) => (
            <li key={q.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{subjectGlyph(q.subject, "h-3.5 w-3.5")} {SUBJECT_MAP[q.subject].label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">난이도 {DIFF_LABEL[q.difficulty]}</span>
                </div>
                <BookmarkButton id={q.id} initialOn={bookmarkSet.has(q.id)} />
              </div>
              <p className="text-[0.95rem] font-medium leading-relaxed">{q.question}</p>
              <p className="mt-2 text-xs text-muted-foreground">정답 {q.answer + 1}. {q.choices[q.answer]}</p>
              <p className="mt-2 rounded-xl bg-muted p-3 text-[0.9rem] leading-relaxed text-muted-foreground">{q.explanation}</p>
            </li>
          ))}
        </ul>
      )}

      {results.length > MAX_RESULTS ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">상위 {MAX_RESULTS}문항만 표시됩니다. 검색어·필터로 좁혀보세요.</p>
      ) : null}
    </div>
  );
}
