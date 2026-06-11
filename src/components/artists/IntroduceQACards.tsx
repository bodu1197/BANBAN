import type { IntroduceQA } from "@/types/artist-form";

/**
 * 샵 상세 — 구조화 소개글(introduce_qa)을 Q&A 카드로 렌더.
 * 질문(q)은 답변 당시 라벨을 그대로 사용. 자유작성(free)은 카드 아래 본문으로.
 * 서버 컴포넌트(상호작용 없음).
 */
export function IntroduceQACards({ data }: Readonly<{ data: IntroduceQA }>): React.ReactElement {
  const free = data.free.trim();
  return (
    <section aria-label="샵 소개" className="border-y border-border/50 bg-background px-4 py-4">
      <div className="space-y-2.5">
        {data.qa.map((item) => (
          <div key={item.id} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold text-brand-primary">Q. {item.q}</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground">{item.a}</p>
          </div>
        ))}
        {free ? (
          <p className="whitespace-pre-line px-1 pt-1 text-sm leading-relaxed text-foreground">{free}</p>
        ) : null}
      </div>
    </section>
  );
}
