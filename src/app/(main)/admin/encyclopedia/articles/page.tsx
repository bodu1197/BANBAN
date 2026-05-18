// admin 백과사전 글 목록 — AdminLayout 이 is_admin 검증.
import Link from "next/link";
import { Plus, Pencil, ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  published: boolean;
  view_count: number;
  published_at: string;
  topic_id: number | null;
}

async function fetchArticles(): Promise<ArticleRow[]> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types limitation
  const { data } = await (supabase as any)
    .from("encyclopedia_articles")
    .select("id, slug, title, category, published, view_count, published_at, topic_id")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as ArticleRow[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default async function AdminEncyclopediaArticlesPage(): Promise<React.ReactElement> {
  const articles = await fetchArticles();

  return (
    <div className="min-h-full p-6 pb-32">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">백과사전 글 관리</h1>
          <p className="mt-1 text-xs text-zinc-400">총 {articles.length}건</p>
        </div>
        <Link
          href="/admin/encyclopedia/articles/new"
          className="flex items-center gap-1.5 rounded-lg bg-pink-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-pink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <Plus className="h-3.5 w-3.5" /> 새 글 작성
        </Link>
      </header>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-xs text-zinc-400">
              <th className="px-4 py-3 font-medium">제목</th>
              <th className="px-4 py-3 font-medium">slug</th>
              <th className="px-4 py-3 font-medium">카테고리</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">조회수</th>
              <th className="px-4 py-3 font-medium">출처</th>
              <th className="px-4 py-3 font-medium">게시일</th>
              <th className="px-4 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-white">
                  <span className="line-clamp-1">{a.title}</span>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">{a.slug}</td>
                <td className="px-4 py-3 text-xs text-zinc-400">{a.category}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${a.published ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-500/20 text-zinc-400"}`}>
                    {a.published ? "게시" : "임시저장"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">{a.view_count.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${a.topic_id ? "bg-blue-500/20 text-blue-300" : "bg-pink-500/20 text-pink-300"}`}>
                    {a.topic_id ? "AI" : "수동"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(a.published_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/admin/encyclopedia/articles/${a.id}/edit`}
                      aria-label={`${a.title} 수정`}
                      title="수정"
                      className="flex h-8 w-8 items-center justify-center rounded text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/encyclopedia/${encodeURIComponent(a.slug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${a.title} 공개 페이지 열기`}
                      title="공개 페이지 열기"
                      className="flex h-8 w-8 items-center justify-center rounded text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {articles.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-500">아직 작성된 글이 없습니다.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
