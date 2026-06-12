import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { getPublishedNews } from "@/lib/study-news/store";
import { StudyNewsRow } from "@/components/study/StudyNewsRow";

export const metadata: Metadata = {
  title: "문신사 뉴스 — 문신사법·국가시험 소식 | 반언니",
  description: "문신사법·문신사 국가시험 관련 최신 뉴스를 한곳에서. 정부·공식 출처와 신뢰 언론을 큐레이션합니다.",
  alternates: { canonical: "/study-news" },
};
export const dynamic = "force-dynamic";

export default async function StudyNewsPage(): Promise<React.ReactElement> {
  const items = await getPublishedNews(60);
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary"><Newspaper className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        <h1 className="text-xl font-bold">문신사 뉴스</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">문신사법·국가시험 관련 소식입니다.</p>

      {items.length > 0 ? (
        <p className="mb-4 rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
          요약은 AI가 원문을 바탕으로 생성합니다. 정확한 내용은 원문·공식 출처를 확인하세요. <b className="text-brand-primary">공식</b> 배지는 정부·법령 1차 출처입니다.
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">아직 수집된 뉴스가 없습니다. 곧 업데이트됩니다.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => <StudyNewsRow key={n.slug} item={n} />)}
        </ul>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">일정·기준은 변동될 수 있습니다. 보건복지부·국시원 공식 공고를 확인하세요.</p>
    </div>
  );
}
