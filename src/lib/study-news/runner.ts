// 뉴스 자동수집 오케스트레이션(서버 전용). cron 라우트가 호출.
// 흐름: 후보 수집 → 기존 url_hash 제외 → AI 요약 → tier 분기(공식 자동게시/언론 초안) → upsert → 캐시 무효화 + 색인 통지.
import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { collectCandidates, type Candidate } from "@/lib/study-news/collect";
import { summarizeNews } from "@/lib/study-news/summarize";
import { createAdminClient } from "@/lib/supabase/server";
import { notifySearchEngines } from "@/lib/utils/search-notify";
import { STUDY_NEWS_CACHE_TAG } from "@/lib/study-news/store";

const MAX_NEW_PER_RUN = 10; // 1회 처리 상한(비용·시간 보호)
const MIN_RELEVANCE = 5; // 관련도 미만이면 폐기
const AI_CONCURRENCY = 2; // OpenAI 동시 요약 제한(레이트리밋·비용)
const STALE_DRAFT_DAYS = 3; // 검토 미승인 draft 자동 반려 기한(일)

interface NewsInsert {
  slug: string;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  source_domain: string;
  tier: number;
  category: string | null;
  relevance: number | null;
  url_hash: string;
  status: "published" | "draft";
  published_at: string | null;
}

export interface CollectResult {
  ok: boolean;
  collected: number;
  inserted: number;
  published: number;
  drafted: number;
  autoRejected: number;
  reason?: string;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor;
      cursor += 1;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function buildRow(c: Candidate): Promise<NewsInsert | null> {
  const ai = await summarizeNews({ title: c.title, snippet: c.snippet, sourceName: c.sourceName });
  const relevance = ai?.relevance ?? null;
  if (relevance !== null && relevance < MIN_RELEVANCE) return null; // 관련 없음 → 폐기
  const summary = ai?.summary ?? (c.snippet || c.title);
  const status: "published" | "draft" = c.tier === 1 ? "published" : "draft";
  return {
    slug: c.slug,
    title: c.title,
    summary,
    source_name: c.sourceName,
    source_url: c.url,
    source_domain: c.domain,
    tier: c.tier,
    category: ai?.category ?? null,
    relevance,
    url_hash: c.urlHash,
    status,
    // RSS 원문 발행일을 초안에도 저장 → 승인 시 원문일 보존(공개는 status 로 게이트되어 무해)
    published_at: c.publishedAt ?? (status === "published" ? new Date().toISOString() : null),
  };
}

/** 등록 후 STALE_DRAFT_DAYS 일이 지나도록 승인(published)되지 않은 draft 를 자동 반려.
 *  tier1(공식)은 수집 즉시 published 라 대상 아님 — 검토 대기(주로 tier2 언론) draft 만 해당.
 *  반환: 이번에 반려된 건수. */
async function rejectStaleDrafts(admin: ReturnType<typeof createAdminClient>): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_DRAFT_DAYS * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("study_news_items")
    .update({ status: "rejected" })
    .eq("status", "draft")
    .lt("created_at", cutoff)
    .select("slug");
  if (error) return 0;
  const count = data?.length ?? 0;
  if (count > 0) revalidatePath("/admin/study-news"); // 검토 큐에서 즉시 제거
  return count;
}

export async function runStudyNewsCollect(): Promise<CollectResult> {
  const admin = createAdminClient();
  const autoRejected = await rejectStaleDrafts(admin); // 3일 경과 미승인 draft 자동 반려

  const candidates = await collectCandidates();
  if (candidates.length === 0) return { ok: true, collected: 0, inserted: 0, published: 0, drafted: 0, autoRejected };

  const { data: existing } = await admin
    .from("study_news_items")
    .select("url_hash")
    .in("url_hash", candidates.map((c) => c.urlHash));
  const known = new Set((existing ?? []).map((r) => r.url_hash));

  const fresh = candidates.filter((c) => !known.has(c.urlHash)).slice(0, MAX_NEW_PER_RUN);
  if (fresh.length === 0) return { ok: true, collected: candidates.length, inserted: 0, published: 0, drafted: 0, autoRejected };

  const built = await mapWithConcurrency(fresh, AI_CONCURRENCY, buildRow);
  const rows = built.filter((r): r is NewsInsert => r !== null);
  if (rows.length === 0) return { ok: true, collected: candidates.length, inserted: 0, published: 0, drafted: 0, autoRejected };

  const { error } = await admin.from("study_news_items").upsert(rows, { onConflict: "url_hash", ignoreDuplicates: true });
  if (error) return { ok: false, collected: candidates.length, inserted: 0, published: 0, drafted: 0, autoRejected, reason: error.message };

  revalidateTag(STUDY_NEWS_CACHE_TAG, { expire: 0 });
  const publishedRows = rows.filter((r) => r.status === "published");
  if (publishedRows.length > 0) {
    notifySearchEngines([...publishedRows.map((r) => `/study-news/${r.slug}`), "/study-news"]);
  }

  return {
    ok: true,
    collected: candidates.length,
    inserted: rows.length,
    published: publishedRows.length,
    drafted: rows.length - publishedRows.length,
    autoRejected,
  };
}
