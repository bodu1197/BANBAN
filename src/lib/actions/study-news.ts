"use server";

// 공부방 뉴스 검토 — 관리자만. service-role(createAdminClient)로 status 갱신(RLS 우회).
// 이중 방어: /admin layout 게이트 + 여기 isCurrentUserAdmin 재검증. 단일 액션(intent) + useActionState.
import { revalidatePath, revalidateTag } from "next/cache";
import { getUser } from "@/lib/supabase/auth";
import { isCurrentUserAdmin } from "@/lib/supabase/is-current-user-admin";
import { createAdminClient } from "@/lib/supabase/server";
import { notifySearchEngines } from "@/lib/utils/search-notify";
import { STUDY_NEWS_CACHE_TAG } from "@/lib/study-news/store";

export interface StudyNewsActionResult {
  ok: boolean;
  error?: string;
}

type Admin = ReturnType<typeof createAdminClient>;

async function approve(admin: Admin, slug: string, userId: string): Promise<StudyNewsActionResult> {
  // 원문 발행일 보존: 수집 시 저장된 published_at(RSS 원문일) 유지, 없을 때만 승인 시각.
  const { data: row } = await admin.from("study_news_items").select("published_at").eq("slug", slug).eq("status", "draft").maybeSingle();
  const publishedAt = row?.published_at ?? new Date().toISOString();
  const { error } = await admin
    .from("study_news_items")
    .update({ status: "published", published_at: publishedAt, published_by: userId })
    .eq("slug", slug)
    .eq("status", "draft"); // draft 가드 — 재처리/경쟁상태 방지
  if (error) return { ok: false, error: `게시 실패: ${error.message}` };
  revalidateTag(STUDY_NEWS_CACHE_TAG, { expire: 0 });
  revalidatePath("/admin/study-news");
  revalidatePath("/study-news");
  notifySearchEngines([`/study-news/${slug}`, "/study-news"]);
  return { ok: true };
}

async function reject(admin: Admin, slug: string): Promise<StudyNewsActionResult> {
  const { error } = await admin.from("study_news_items").update({ status: "rejected" }).eq("slug", slug).eq("status", "draft");
  if (error) return { ok: false, error: `반려 실패: ${error.message}` };
  revalidatePath("/admin/study-news");
  return { ok: true };
}

export async function reviewStudyNews(_prev: StudyNewsActionResult | null, formData: FormData): Promise<StudyNewsActionResult> {
  const slug = String(formData.get("slug") ?? "").trim();
  const intent = String(formData.get("intent") ?? "");
  if (!slug || (intent !== "approve" && intent !== "reject")) {
    return { ok: false, error: "잘못된 요청입니다." };
  }

  const user = await getUser();
  if (!user || !(await isCurrentUserAdmin())) {
    return { ok: false, error: "권한이 없습니다. (관리자 전용)" };
  }

  const admin = createAdminClient();
  return intent === "approve" ? approve(admin, slug, user.id) : reject(admin, slug);
}
