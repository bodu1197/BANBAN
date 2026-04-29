"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const COMMUNITY_PATH = "/community";

export interface CreateCommentResult {
  success: boolean;
  error?: string;
}

export async function createComment(
  postId: string,
  content: string,
  parentId?: string,
): Promise<CreateCommentResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "unauthorized" };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    user_id: user.id,
    content,
    parent_id: parentId ?? null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // comments_count is maintained by DB trigger (trg_post_comments_count)
  revalidatePath(COMMUNITY_PATH);
  revalidatePath(`${COMMUNITY_PATH}/${postId}`);
  return { success: true };
}

interface LikeRow { id: string }

export async function togglePostLike(postId: string): Promise<{
  success: boolean;
  isLiked: boolean;
  error?: string;
}> {
  const user = await getUser();
  if (!user) return { success: false, isLiked: false, error: "unauthorized" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("likeable_type", "post")
    .eq("likeable_id", postId)
    .maybeSingle() as { data: LikeRow | null };

  if (existing) {
    await supabase.from("likes").delete().eq("id", existing.id);
    // likes_count is maintained by DB trigger (trg_post_likes_count)
    revalidatePath(COMMUNITY_PATH);
    return { success: true, isLiked: false };
  }

  await (supabase.from("likes").insert as unknown as (data: Record<string, string>) => Promise<{ error: { message: string } | null }>)({
    user_id: user.id,
    likeable_type: "post",
    likeable_id: postId,
  });
  // likes_count is maintained by DB trigger (trg_post_likes_count)
  revalidatePath(COMMUNITY_PATH);
  return { success: true, isLiked: true };
}

export interface ReportPostResult {
  success: boolean;
  alreadyReported?: boolean;
  error?: string;
}

const REPORT_REASON_WHITELIST = new Set(["SPAM", "ABUSE", "ADULT", "HATE", "OTHER"]);
const REPORT_DESCRIPTION_MAX = 500;

export async function reportPost(
  postId: string,
  reason: string,
  description?: string,
): Promise<ReportPostResult> {
  const user = await getUser();
  if (!user) return { success: false, error: "unauthorized" };

  const trimmedReason = reason.trim();
  if (!REPORT_REASON_WHITELIST.has(trimmedReason)) {
    return { success: false, error: "invalid reason" };
  }

  const trimmedDescription = description?.trim() ?? null;
  if (trimmedDescription && trimmedDescription.length > REPORT_DESCRIPTION_MAX) {
    return { success: false, error: "description too long" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("reporter_id", user.id)
    .eq("reportable_type", "post")
    .eq("reportable_id", postId)
    .maybeSingle();

  if (existing) {
    return { success: true, alreadyReported: true };
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reportable_type: "post",
    reportable_id: postId,
    reason: trimmedReason,
    description: trimmedDescription,
    status: "PENDING",
  });

  if (error) return { success: false, error: error.message };

  // reports_count is maintained by DB trigger (trg_post_reports_count)
  revalidatePath(`${COMMUNITY_PATH}/${postId}`);
  return { success: true };
}

export async function recordPostView(postId: string, ip?: string): Promise<void> {
  const user = await getUser().catch(() => null);
  const supabase = await createClient();

  const row: { post_id: string; user_id?: string; ip_address?: string } = { post_id: postId };

  if (user) {
    row.user_id = user.id;
  } else if (ip) {
    row.ip_address = ip;
  } else {
    return; // 유저도 IP도 없으면 기록 불가
  }

  // UNIQUE 제약(user or ip)에 걸리면 무시 — 이미 조회한 것
  await supabase.from("post_views").upsert(row, {
    onConflict: user ? "post_id,user_id" : "post_id,ip_address",
    ignoreDuplicates: true,
  });
  // views_count is maintained by DB trigger (trg_post_views_count)
}

export async function createPost(formData: FormData): Promise<{
  success: boolean;
  postId?: string;
  error?: string;
}> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "unauthorized" };
  }

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const typeBoard = (formData.get("type_board") as string) || "QNA";
  const typePost = (formData.get("type_post") as string) || "TATTOO";
  const imageUrl = (formData.get("image_url") as string) || null;
  const youtubeUrl = (formData.get("youtube_url") as string) || null;

  if (!title || !content) {
    return { success: false, error: "title and content required" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      title,
      content,
      type_board: typeBoard,
      type_post: typePost,
      type_artist: "TATTOO",
      image_url: imageUrl,
      youtube_url: youtubeUrl,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(COMMUNITY_PATH);
  return { success: true, postId: data.id };
}

async function isAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", userId).single();
  return (data as { is_admin: boolean } | null)?.is_admin === true;
}

export async function deleteComment(commentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getUser();
  if (!user) return { success: false, error: "unauthorized" };

  const supabase = await createClient();

  const { data: comment } = await supabase
    .from("comments")
    .select("user_id, post_id")
    .eq("id", commentId)
    .single();
  if (!comment) return { success: false, error: "not found" };

  const isOwner = (comment as { user_id: string }).user_id === user.id;
  if (!isOwner) {
    const admin = await isAdmin(supabase, user.id);
    if (!admin) return { success: false, error: "forbidden" };
  }

  const { error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) return { success: false, error: error.message };

  const postId = (comment as { post_id: string }).post_id;
  revalidatePath(COMMUNITY_PATH);
  revalidatePath(`${COMMUNITY_PATH}/${postId}`);
  return { success: true };
}

export async function updateComment(commentId: string, content: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getUser();
  if (!user) return { success: false, error: "unauthorized" };

  if (!content.trim()) return { success: false, error: "content required" };

  const supabase = await createClient();

  const { data: comment } = await supabase
    .from("comments")
    .select("user_id, post_id")
    .eq("id", commentId)
    .single();
  if (!comment) return { success: false, error: "not found" };

  const isOwner = (comment as { user_id: string }).user_id === user.id;
  if (!isOwner) {
    const admin = await isAdmin(supabase, user.id);
    if (!admin) return { success: false, error: "forbidden" };
  }

  const { error } = await supabase
    .from("comments")
    .update({ content })
    .eq("id", commentId);

  if (error) return { success: false, error: error.message };

  const postId = (comment as { post_id: string }).post_id;
  revalidatePath(COMMUNITY_PATH);
  revalidatePath(`${COMMUNITY_PATH}/${postId}`);
  return { success: true };
}

export async function deletePost(postId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "unauthorized" };
  }

  const supabase = await createClient();

  // Check ownership or admin
  const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).single();
  if (!post) return { success: false, error: "not found" };

  const isOwner = (post as { user_id: string }).user_id === user.id;
  if (!isOwner) {
    const admin = await isAdmin(supabase, user.id);
    if (!admin) return { success: false, error: "forbidden" };
  }

  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(COMMUNITY_PATH);
  redirect(COMMUNITY_PATH);
}

export async function updatePost(
  postId: string,
  title: string,
  content: string,
  imageUrl?: string | null,
  youtubeUrl?: string | null,
): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getUser();
  if (!user) return { success: false, error: "unauthorized" };

  const supabase = await createClient();

  // Check ownership or admin
  const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).single();
  if (!post) return { success: false, error: "not found" };

  const isOwner = (post as { user_id: string }).user_id === user.id;
  if (!isOwner) {
    const admin = await isAdmin(supabase, user.id);
    if (!admin) return { success: false, error: "forbidden" };
  }

  const updates: Record<string, unknown> = { title, content };
  if (imageUrl !== undefined) updates.image_url = imageUrl;
  if (youtubeUrl !== undefined) updates.youtube_url = youtubeUrl;

  const { error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", postId);

  if (error) return { success: false, error: error.message };

  revalidatePath(COMMUNITY_PATH);
  revalidatePath(`${COMMUNITY_PATH}/${postId}`);
  return { success: true };
}
