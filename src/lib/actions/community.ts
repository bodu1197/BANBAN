"use server";

import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { containsProfanity } from "@/lib/utils/profanity-filter";
import { notifySearchEngines } from "@/lib/utils/search-notify";
import { getClientIp } from "@/lib/rate-limit";
import { isCurrentUserAdmin } from "@/lib/supabase/is-current-user-admin";
import { POST_TITLE_MAX, POST_CONTENT_MAX, COMMENT_MAX } from "@/lib/post-limits";
import type { Database } from "@/types/database";

const COMMUNITY_PATH = "/community";
const PROFANITY_ERROR = "부적절한 표현이 포함되어 있습니다";
const LOGIN_REQUIRED_ERROR = "로그인이 필요합니다";
const FORBIDDEN_ERROR = "권한이 없습니다";
const NOT_FOUND_ERROR = "글을 찾을 수 없습니다";
// DB 오류 원문(테이블·제약 이름)을 사용자에게 보여주지 않는다.
const SAVE_FAILED_ERROR = "저장에 실패했습니다. 잠시 후 다시 시도해주세요";
const IMAGE_URL_ERROR = "첨부 이미지 주소가 올바르지 않습니다";
// 글쓰기로 생성 가능한 게시판 화이트리스트(샵인샵 임대·구인 / 질문답변). 그 외 값은 QNA 로 강제.
const ALLOWED_WRITE_BOARDS = new Set(["SHOP_IN_SHOP", "QNA"]);

/** 서버에만 남기고 사용자에게는 고정 문구를 준다. */
function logDbError(where: string, error: { message: string }): void {
  // eslint-disable-next-line no-console -- DB 오류 원문은 서버 로그에만 남긴다
  console.error(`[community] ${where}: ${error.message}`);
}

export interface CreateCommentResult {
  success: boolean;
  error?: string;
}

/** 댓글 대상 검증 — 살아있는 글인지, 부모 댓글이 정말 그 글의 것인지. */
async function commentTargetError(postId: string, parentId?: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("id")
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!post) return NOT_FOUND_ERROR;

  if (!parentId) return null;
  const { data: parent } = await supabase
    .from("comments")
    .select("post_id")
    .eq("id", parentId)
    .is("deleted_at", null)
    .maybeSingle();
  const belongsToPost = (parent as { post_id: string } | null)?.post_id === postId;
  return belongsToPost ? null : NOT_FOUND_ERROR;
}

export async function createComment(
  postId: string,
  content: string,
  parentId?: string,
): Promise<CreateCommentResult> {
  const user = await getUser();
  if (!user) return { success: false, error: LOGIN_REQUIRED_ERROR };

  const contentError = validateText(content, COMMENT_MAX, "댓글");
  if (contentError) return { success: false, error: contentError };

  const targetError = await commentTargetError(postId, parentId);
  if (targetError) return { success: false, error: targetError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, content, parent_id: parentId ?? null, user_id: user.id });
  if (error) {
    logDbError("createComment", error);
    return { success: false, error: SAVE_FAILED_ERROR };
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

  // 쓰기 결과를 무시하면 실패해도 하트가 켜진 것처럼 보이고, 새로고침하면 되돌아간다.
  const wasLiked = Boolean(existing);
  const { error } = wasLiked
    ? await supabase.from("likes").delete().eq("id", (existing as LikeRow).id)
    : await supabase.from("likes").insert({ user_id: user.id, likeable_type: "post", likeable_id: postId });

  if (error) {
    logDbError("togglePostLike", error);
    return { success: false, isLiked: wasLiked, error: SAVE_FAILED_ERROR };
  }

  // likes_count is maintained by DB trigger (trg_post_likes_count)
  revalidatePath(COMMUNITY_PATH);
  revalidatePath(`${COMMUNITY_PATH}/${postId}`);
  return { success: true, isLiked: !wasLiked };
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

  if (error) {
    logDbError("reportPost", error);
    return { success: false, error: SAVE_FAILED_ERROR };
  }

  // reports_count is maintained by DB trigger (trg_post_reports_count)
  revalidatePath(`${COMMUNITY_PATH}/${postId}`);
  return { success: true };
}

/**
 * 조회 기록. IP 는 **서버가 헤더에서 직접** 읽는다 —
 * 인자로 받으면 서버 액션이라 누구나 임의 IP 를 심을 수 있다.
 */
export async function recordPostView(postId: string): Promise<void> {
  const user = await getUser().catch(() => null);
  // 유일한 기록 경로다. anon 에게는 INSERT 정책을 주지 않는다(공개 키로 조회수를 부풀릴 수 있다) —
  // 그래서 여기서만 service_role 로 쓴다. 방문 IP 는 어차피 아무에게도 읽히지 않는다(SELECT 정책 없음).
  const supabase = createAdminClient();

  const row: { post_id: string; user_id?: string; ip_address?: string } = { post_id: postId };

  if (user) {
    row.user_id = user.id;
  } else {
    const ip = getClientIp(await headers());
    if (ip === "unknown") return; // 유저도 IP도 없으면 기록 불가
    row.ip_address = ip;
  }

  // UNIQUE 제약(user or ip)에 걸리면 무시 — 이미 조회한 것
  await supabase.from("post_views").upsert(row, {
    onConflict: user ? "post_id,user_id" : "post_id,ip_address",
    ignoreDuplicates: true,
  });
  // views_count is maintained by DB trigger (trg_post_views_count)
}

/** 비어있음·길이초과·욕설을 한 번에 검사. 문제가 없으면 null. */
function validateText(value: unknown, max: number, label: string): string | null {
  if (typeof value !== "string" || !value.trim()) return `${label}을(를) 입력해주세요`;
  if (value.length > max) return `${label}은(는) ${max}자를 넘을 수 없습니다`;
  return containsProfanity(value) ? PROFANITY_ERROR : null;
}

function validatePostContent(title: unknown, content: unknown): string | null {
  return validateText(title, POST_TITLE_MAX, "제목") ?? validateText(content, POST_CONTENT_MAX, "내용");
}

/** FormData 값은 File 일 수도 null 일 수도 있다 — 문자열만 통과시킨다. */
function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * 첨부 이미지는 우리 Storage 공개 버킷만 허용한다.
 * 외부 URL 을 넣으면 next/image 가 remotePatterns 밖이라며 렌더에서 throw → 그 글이 영구 500 이 된다.
 *
 * @returns 허용되면 URL, 비었으면 null, **허용되지 않으면 undefined**
 *          (조용히 null 로 바꾸면 수정 한 번에 멀쩡한 이미지가 사라진다)
 */
function safeImageUrl(raw: string): string | null | undefined {
  if (!raw) return null;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  if (!base) return undefined; // env 가 없으면 판정 불가 — 지우지 말고 거부한다
  return raw.startsWith(`${base}/storage/v1/object/public/`) ? raw : undefined;
}

/** posts 에 넣을 값 (작성자 컬럼 제외) — 필드명이 바뀌면 컴파일이 깨지도록 명시한다. */
interface PostRowInput {
  title: string;
  content: string;
  type_board: string;
  type_post: string;
  type_artist: string;
  image_url: string | null;
  youtube_url: string | null;
}

/**
 * 글쓰기 폼 → posts 행 (작성자 컬럼 제외). 허용되지 않은 게시판은 QNA 로 강제된다.
 * @returns 이미지 주소가 허용되지 않으면 undefined (조용히 버리지 않는다 — updatePost 와 같은 계약)
 */
function parsePostFields(formData: FormData): PostRowInput | undefined {
  const rawBoard = formString(formData, "type_board") || "QNA";
  const imageUrl = safeImageUrl(formString(formData, "image_url"));
  if (imageUrl === undefined) return undefined;

  return {
    title: formString(formData, "title"),
    content: formString(formData, "content"),
    type_board: ALLOWED_WRITE_BOARDS.has(rawBoard) ? rawBoard : "QNA",
    type_post: formString(formData, "type_post") || "BEAUTY",
    type_artist: "SEMI_PERMANENT",
    image_url: imageUrl,
    youtube_url: formString(formData, "youtube_url") || null,
  };
}

export async function createPost(formData: FormData): Promise<{
  success: boolean;
  postId?: string;
  error?: string;
}> {
  const user = await getUser();
  if (!user) return { success: false, error: LOGIN_REQUIRED_ERROR };

  const base = parsePostFields(formData);
  if (!base) return { success: false, error: IMAGE_URL_ERROR };

  const validationError = validatePostContent(base.title, base.content);
  if (validationError) return { success: false, error: validationError };

  // 회원 글은 RLS(posts_insert: user_id = auth.uid())를 그대로 통과시킨다.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({ ...base, user_id: user.id })
    .select("id")
    .single();

  if (error) {
    logDbError("createPost", error);
    return { success: false, error: SAVE_FAILED_ERROR };
  }

  revalidatePath(COMMUNITY_PATH);
  notifySearchEngines([`${COMMUNITY_PATH}/${data.id}`, COMMUNITY_PATH]);
  return { success: true, postId: data.id };
}

/**
 * 글·댓글 수정/삭제 권한 검사 (수정·삭제 4개 액션의 단일 진입점).
 * 본인 글이거나 관리자일 때만 통과한다.
 *
 * @returns 통과하면 null, 막히면 사용자에게 보여줄 사유
 */
async function manageDenyReason(
  ownerId: string | null,
  userId: string | null,
): Promise<string | null> {
  if (!userId) return LOGIN_REQUIRED_ERROR;
  if (ownerId === userId) return null;
  return await isCurrentUserAdmin() ? null : FORBIDDEN_ERROR;
}

interface CommentOwnerRow {
  user_id: string | null;
  post_id: string;
}

/** 댓글 수정·삭제 공통: 댓글을 찾고 권한을 확인한다. */
async function authorizeComment(
  commentId: string,
): Promise<{ postId: string } | { error: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("user_id, post_id")
    .eq("id", commentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return { error: NOT_FOUND_ERROR };

  const comment = data as CommentOwnerRow;
  const user = await getUser();
  const deny = await manageDenyReason(comment.user_id, user?.id ?? null);
  if (deny) return { error: deny };

  return { postId: comment.post_id };
}

export async function deleteComment(commentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await authorizeComment(commentId);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await createAdminClient()
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) {
    logDbError("deleteComment", error);
    return { success: false, error: SAVE_FAILED_ERROR };
  }

  revalidatePath(COMMUNITY_PATH);
  revalidatePath(`${COMMUNITY_PATH}/${auth.postId}`);
  return { success: true };
}

export async function updateComment(commentId: string, content: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const contentError = validateText(content, COMMENT_MAX, "댓글");
  if (contentError) return { success: false, error: contentError };

  const auth = await authorizeComment(commentId);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await createAdminClient()
    .from("comments")
    .update({ content })
    .eq("id", commentId);

  if (error) {
    logDbError("updateComment", error);
    return { success: false, error: SAVE_FAILED_ERROR };
  }

  revalidatePath(COMMUNITY_PATH);
  revalidatePath(`${COMMUNITY_PATH}/${auth.postId}`);
  return { success: true };
}

/** 글 수정·삭제 공통: 글을 찾고 권한을 확인한다. @returns 통과하면 null, 막히면 사유 */
async function authorizePostError(postId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return NOT_FOUND_ERROR;

  const user = await getUser();
  return manageDenyReason((data as { user_id: string | null }).user_id, user?.id ?? null);
}

export async function deletePost(postId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const denied = await authorizePostError(postId);
  if (denied) return { success: false, error: denied };

  const { error } = await createAdminClient()
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId);

  if (error) {
    logDbError("deletePost", error);
    return { success: false, error: SAVE_FAILED_ERROR };
  }

  revalidatePath(COMMUNITY_PATH);
  notifySearchEngines(`${COMMUNITY_PATH}/${postId}`, "URL_DELETED");
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
  const validationError = validatePostContent(title, content);
  if (validationError) return { success: false, error: validationError };

  const denied = await authorizePostError(postId);
  if (denied) return { success: false, error: denied };

  const updates: Database["public"]["Tables"]["posts"]["Update"] = { title, content };
  if (imageUrl !== undefined) {
    const checked = safeImageUrl(imageUrl ?? "");
    // 허용되지 않는 이미지면 조용히 지우지 않고 저장 자체를 거부한다.
    if (checked === undefined) return { success: false, error: IMAGE_URL_ERROR };
    updates.image_url = checked;
  }
  if (youtubeUrl !== undefined) updates.youtube_url = youtubeUrl;

  const { error } = await createAdminClient()
    .from("posts")
    .update(updates)
    .eq("id", postId);

  if (error) {
    logDbError("updatePost", error);
    return { success: false, error: SAVE_FAILED_ERROR };
  }

  revalidatePath(COMMUNITY_PATH);
  revalidatePath(`${COMMUNITY_PATH}/${postId}`);
  notifySearchEngines([`${COMMUNITY_PATH}/${postId}`, COMMUNITY_PATH]);
  return { success: true };
}
