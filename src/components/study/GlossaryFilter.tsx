// @client-reason: 용어 검색 입력 + 카테고리 칩 즉시 필터링
"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { STUDY_INPUT, studyFilterChip } from "@/components/study/study-styles";
import type { GlossaryTerm, GlossaryCategory } from "@/data/study/glossary";

export function GlossaryFilter({ terms, categories }: Readonly<{ terms: GlossaryTerm[]; categories: GlossaryCategory[] }>): React.ReactElement {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<GlossaryCategory | null>(null);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return terms.filter((t) => {
      if (cat && t.category !== cat) return false;
      if (!kw) return true;
      return t.term.toLowerCase().includes(kw) || (t.en?.toLowerCase().includes(kw) ?? false) || t.def.toLowerCase().includes(kw);
    });
  }, [terms, q, cat]);

  return (
    <div className="py-4">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="용어·영문·뜻 검색" aria-label="용어·영문명·정의로 검색" className={`${STUDY_INPUT} pl-9`} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setCat(null)} aria-pressed={cat === null} className={studyFilterChip(cat === null)}>전체</button>
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={studyFilterChip(cat === c)}>{c}</button>
        ))}
      </div>
      <p className="mb-3 text-xs tabular-nums text-muted-foreground">{filtered.length}개 용어</p>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">검색 결과가 없습니다</div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((t) => (
            <li key={t.term} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h2 className="font-bold">{t.term}</h2>
                {t.en ? <span className="text-xs text-muted-foreground">{t.en}</span> : null}
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{t.category}</span>
              </div>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted-foreground">{t.def}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
