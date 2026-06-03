"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import { earnPointsWithLimit } from "@/lib/supabase/point-queries";
import { containsProfanity } from "@/lib/utils/profanity-filter";

const COMMENT_PROFANITY_ERROR = "부적절한 표현이 포함되어 있습니다";
const MAX_REVIEW_COMMENT_LENGTH = 500;

export async function submitReview(
  artistId: string,
  rating: number,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "unauthorized" };
  }

  if (rating < 1 || rating > 5) {
    return { success: false, error: "invalid rating" };
  }

  if (!content.trim()) {
    return { success: false, error: "content required" };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("reviews").insert({
    artist_id: artistId,
    user_id: user.id,
    rating,
    content: content.trim(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // 후기 작성 포인트 (1회/일)
  void earnPointsWithLimit({ userId: user.id, amount: 20_000, reason: "REVIEW", description: "후기 작성" })
    .catch(() => { /* best-effort 적립 — 실패해도 후기 작성 자체는 성공 처리 */ });

  revalidatePath(`/artists/${artistId}`);
  return { success: true };
}

async function isValidReplyParent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string,
  reviewId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("review_comments")
    .select("review_id, parent_id")
    .eq("id", parentId)
    .is("deleted_at", null)
    .maybeSingle();
  const p = data as { review_id: string; parent_id: string | null } | null;
  return Boolean(p) && p?.review_id === reviewId && p?.parent_id === null;
}

export async function createReviewComment(
  reviewId: string,
  content: string,
  parentId?: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "unauthorized" };

  const trimmed = content.trim();
  if (!trimmed) return { success: false, error: "content required" };
  if (trimmed.length > MAX_REVIEW_COMMENT_LENGTH) return { success: false, error: "댓글이 너무 깁니다" };
  if (containsProfanity(trimmed)) return { success: false, error: COMMENT_PROFANITY_ERROR };

  const supabase = await createClient();

  // 대댓글: 부모가 같은 후기 + 최상위(1단계 중첩만)인지 검증 — 교차후기 첨부/무한중첩 방지.
  if (parentId && !(await isValidReplyParent(supabase, parentId, reviewId))) {
    return { success: false, error: "invalid parent comment" };
  }

  const { error } = await supabase.from("review_comments").insert({
    review_id: reviewId,
    user_id: user.id,
    content: trimmed,
    parent_id: parentId ?? null,
  });
  if (error) return { success: false, error: error.message };

  revalidatePath("/community");
  return { success: true };
}

export async function deleteReviewComment(
  commentId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "unauthorized" };

  const supabase = await createClient();
  // 본인 댓글만 soft delete (RLS review_comments_delete/update_own 도 강제).
  const { error } = await supabase
    .from("review_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("user_id", user.id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/community");
  return { success: true };
}
