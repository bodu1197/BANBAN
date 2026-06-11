// 교과서 단원 본문 렌더(서버 컴포넌트, 정적·읽기전용).
import Image from "next/image";
import { Check } from "lucide-react";
import type { TheoryChapter, TheoryTable, TheoryFigure } from "@/data/study/theory";
import { CHAPTER_FIGURES } from "@/data/study/figures";

// 본문 가독성용 산문 스타일(0.97rem 글자·1.85 행간).
const PROSE = "space-y-3 text-[0.97rem] leading-[1.85] text-foreground";
const FALLBACK_DIM = 1024; // 도해 dim 누락 대비 기본값(실제 11개 전부 width/height 보유).

export function TextbookChapter({ chapter, index }: Readonly<{ chapter: TheoryChapter; index: number }>): React.ReactElement {
  const figure = chapter.figure ?? CHAPTER_FIGURES[chapter.heading];
  const keyPoints = chapter.keyPoints ?? [];
  return (
    <section id={`ch-${index}`} className="scroll-mt-20">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand-primary text-xs font-bold text-white">{index}</span>
        {chapter.heading}
      </h2>
      <div className={PROSE}>
        {chapter.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </div>
      {chapter.table ? <TextbookTable table={chapter.table} /> : null}
      {figure ? <TextbookFigure figure={figure} /> : null}
      {chapter.sections?.map((s) => (
        <div key={s.title} className="mt-6">
          <h3 className="mb-2 border-b border-border pb-1 font-semibold text-brand-primary">{s.title}</h3>
          <div className={PROSE}>
            {s.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          {s.table ? <TextbookTable table={s.table} /> : null}
        </div>
      ))}
      {keyPoints.length > 0 ? (
        <div className="mt-5 rounded-xl bg-brand-primary/10 p-4">
          <p className="mb-2 text-sm font-bold text-brand-primary">핵심 정리</p>
          <ul className="space-y-1.5">
            {keyPoints.map((kp, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
                <span>{kp}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function TextbookTable({ table }: Readonly<{ table: TheoryTable }>): React.ReactElement {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {table.columns.map((c, i) => <th key={i} scope="col" className="whitespace-nowrap px-3 py-2 text-left font-semibold text-foreground">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border">
              {row.map((cell, ci) => <td key={ci} className="px-3 py-2 align-top leading-relaxed">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {table.caption ? <p className="mt-2 text-center text-xs text-muted-foreground">{table.caption}</p> : null}
    </div>
  );
}

function TextbookFigure({ figure }: Readonly<{ figure: TheoryFigure }>): React.ReactElement {
  return (
    <figure className="mt-5">
      {/* bg-white: 다크모드에서도 도해(흰 배경 일러스트) 가독성 유지 */}
      <Image
        src={figure.src}
        alt={figure.alt}
        width={figure.width ?? FALLBACK_DIM}
        height={figure.height ?? FALLBACK_DIM}
        sizes="(max-width: 640px) 100vw, 576px"
        loading="lazy"
        className="mx-auto h-auto w-full max-w-xl rounded-xl border border-border bg-white"
      />
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">{figure.caption ?? figure.alt}<span className="ml-1">· 학습용 일러스트</span></figcaption>
    </figure>
  );
}
