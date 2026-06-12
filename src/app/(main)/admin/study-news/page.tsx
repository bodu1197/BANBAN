import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { fmtDate, safeSourceUrl } from "@/lib/study-news/format";
import { StudyNewsDraftActions } from "@/components/admin/study-news-draft-actions";

export const metadata: Metadata = { title: "공부방 뉴스 검토 | 관리자", robots: { index: false } };
export const dynamic = "force-dynamic";

const DRAFT_QUEUE_LIMIT = 100; // 한 화면 검토 대기열 상한 (tier2 언론은 하루 최대 MAX_NEW_PER_RUN=10건 유입)

export default async function AdminStudyNewsPage(): Promise<React.ReactElement> {
  // 게이트는 상위 /admin layout(getUser→profiles.is_admin→redirect)이 처리.
  // draft 는 항상 tier2(언론)뿐 — tier1(공식)은 수집 시 자동 게시되어 draft 로 남지 않음.
  const { data } = await createAdminClient()
    .from("study_news_items")
    .select("slug,title,summary,source_name,source_url,category,relevance,created_at")
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(DRAFT_QUEUE_LIMIT);
  const drafts = data ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary"><Newspaper className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        <h1 className="text-xl font-bold">공부방 뉴스 검토</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">언론(Tier2) 출처는 검토 후 게시 / 공식(Tier1) 출처는 자동 게시. 대기 <b className="text-brand-primary tabular-nums">{drafts.length}</b>건</p>

      {drafts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">검토 대기 중인 뉴스가 없습니다.</div>
      ) : (
        <ul className="space-y-3">
          {drafts.map((n) => {
            const src = safeSourceUrl(n.source_url);
            return (
              <li key={n.slug} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border px-2 py-0.5 text-[0.7rem] font-semibold">언론</span>
                  <span className="truncate">{n.source_name}</span>
                  {n.category ? <span>· {n.category}</span> : null}
                  {n.relevance !== null ? <span className="tabular-nums">· 관련도 {n.relevance}</span> : null}
                  <span className="ml-auto tabular-nums">{fmtDate(n.created_at)}</span>
                </div>
                <p className="font-bold leading-snug">{n.title}</p>
                <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{n.summary}</p>
                {src ? <a href={src} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-block text-xs font-medium text-brand-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">원문 보기 →</a> : null}
                <StudyNewsDraftActions slug={n.slug} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
