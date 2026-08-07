"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { containsProfanity } from "@/lib/utils/profanity-filter";
import { notifySearchEngines } from "@/lib/utils/search-notify";
import {
  prepareGuest,
  insertGuestPost,
  insertGuestComment,
  verifyGuestPassword,
  getRequestIp,
  GUEST_FLOOD_ERROR,
  LOCK_MINUTES,
  type GuestInput,
  type GuestPostRow,
  type GuestTarget,
} from "@/lib/guest-auth";
import { isCurrentUserAdmin } from "@/lib/supabase/is-current-user-admin";
import { POST_TITLE_MAX, POST_CONTENT_MAX, COMMENT_MAX } from "@/lib/post-limits";
import type { Database } from "@/types/database";

const COMMUNITY_PATH = "/community";
const PROFANITY_ERROR = "부적절한 표현이 포함되어 있습니다";
const GUEST_PASSWORD_ERROR = "비밀번호가 일치하지 않습니다";
const GUEST_LOCKED_ERROR = `비밀번호를 여러 번 틀렸습니다. ${LOCK_MINUTES}분 뒤에 다시 시도해주세요`;
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
  guest?: GuestInput,
): Promise<CreateCommentResult> {
  const user = await getUser();

  const contentError = validateText(content, COMMENT_MAX, "댓글");
  if (contentError) return { success: false, error: contentError };

  const targetError = await commentTargetError(postId, parentId);
  if (targetError) return { success: false, error: targetError };

  // RLS(auth.uid() = user_id)로는 게스트 댓글을 넣을 수 없으므로 admin 클라이언트로 쓴다.
  const db = createAdminClient();
  const base = { post_id: postId, content, parent_id: parentId ?? null };

  if (user) {
    const { error } = await db.from("comments").insert({ ...base, user_id: user.id });
    if (error) {
      logDbError("createComment", error);
      return { success: false, error: SAVE_FAILED_ERROR };
    }
  } else {
    const prepared = await prepareGuest(guest);
    if (!prepared.ok) return { success: false, error: prepared.error };

    // 도배 카운트·본문·비밀번호를 한 트랜잭션에 넣는다(RPC). null = 도배로 차단됨.
    const id = await insertGuestComment(postId, parentId ?? null, content, prepared)
      .catch(() => undefined);
    if (id === undefined) return { success: false, error: SAVE_FAILED_ERROR };
    if (id === null) return { success: false, error: GUEST_FLOOD_ERROR };
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
    revalidatePath(`${COMMUNITY_PATH}/${postId}`);
    return { success: true, isLiked: false };
  }

  await supabase.from("likes").insert({
    user_id: user.id,
    likeable_type: "post",
    likeable_id: postId,
  });
  // likes_count is maintained by DB trigger (trg_post_likes_count)
  revalidatePath(COMMUNITY_PATH);
  revalidatePath(`${COMMUNITY_PATH}/${postId}`);
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
  // anon 클라이언트로는 안 된다 — post_views 의 SELECT 정책을 없애(방문 IP 비공개) ON CONFLICT 경로가 막힌다.
  const supabase = createAdminClient();

  const row: { post_id: string; user_id?: string; ip_address?: string } = { post_id: postId };

  if (user) {
    row.user_id = user.id;
  } else {
    const ip = await getRequestIp();
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

/**
 * 글쓰기 폼 → posts 행 (작성자 컬럼 제외). 허용되지 않은 게시판은 QNA 로 강제된다.
 * @returns 이미지 주소가 허용되지 않으면 undefined (조용히 버리지 않는다 — updatePost 와 같은 계약)
 */
function parsePostFields(formData: FormData): GuestPostRow | undefined {
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
  const base = parsePostFields(formData);
  if (!base) return { success: false, error: IMAGE_URL_ERROR };

  const validationError = validatePostContent(base.title, base.content);
  if (validationError) return { success: false, error: validationError };

  if (!user) return createGuestPost(base, readGuestInput(formData));

  // 회원 글은 RLS(posts_insert_auth: auth.uid() = user_id)를 그대로 통과시킨다.
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

/** 비로그인 글 저장 — 도배 카운트·본문·비밀번호가 한 트랜잭션(RPC)에서 처리된다. */
async function createGuestPost(
  base: GuestPostRow,
  guest: GuestInput | undefined,
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const prepared = await prepareGuest(guest);
  if (!prepared.ok) return { success: false, error: prepared.error };

  const postId = await insertGuestPost(base, prepared).catch(() => undefined);
  if (postId === undefined) return { success: false, error: SAVE_FAILED_ERROR };
  if (postId === null) return { success: false, error: GUEST_FLOOD_ERROR };

  revalidatePath(COMMUNITY_PATH);
  // 게스트 글은 검증되지 않은 작성자라 색인을 먼저 요청하지 않는다(공개·크롤은 그대로).
  return { success: true, postId };
}

/** 글쓰기 폼에서 게스트 닉네임·비밀번호 읽기 (비로그인 작성 시에만 채워진다). */
function readGuestInput(formData: FormData): GuestInput | undefined {
  const name = formData.get("guest_name");
  const password = formData.get("guest_password");
  if (typeof name !== "string" || typeof password !== "string") return undefined;
  return { name, password };
}

/**
 * 글·댓글 수정/삭제 권한 검사 (수정·삭제 4개 액션의 단일 진입점).
 * - 회원 글(ownerId 있음): 본인 또는 관리자
 * - 게스트 글(ownerId 없음): 관리자, 또는 작성 시 정한 비밀번호가 맞을 때
 *
 * @returns 통과하면 null, 막히면 사용자에게 보여줄 사유
 */
async function manageDenyReason(
  target: GuestTarget,
  rowId: string,
  ownerId: string | null,
  userId: string | null,
  guestPassword?: string,
): Promise<string | null> {
  if (userId && ownerId === userId) return null;
  if (userId && await isCurrentUserAdmin()) return null;
  if (ownerId !== null) return FORBIDDEN_ERROR;

  const verdict = await verifyGuestPassword(target, rowId, guestPassword);
  if (verdict === "ok") return null;
  return verdict === "locked" ? GUEST_LOCKED_ERROR : GUEST_PASSWORD_ERROR;
}

interface CommentOwnerRow {
  user_id: string | null;
  post_id: string;
}

/** 댓글 수정·삭제 공통: 댓글을 찾고 권한을 확인한다. */
async function authorizeComment(
  commentId: string,
  guestPassword?: string,
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
  const deny = await manageDenyReason("comments", commentId, comment.user_id, user?.id ?? null, guestPassword);
  if (deny) return { error: deny };

  return { postId: comment.post_id };
}

export async function deleteComment(commentId: string, guestPassword?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await authorizeComment(commentId, guestPassword);
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

export async function updateComment(commentId: string, content: string, guestPassword?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const contentError = validateText(content, COMMENT_MAX, "댓글");
  if (contentError) return { success: false, error: contentError };

  const auth = await authorizeComment(commentId, guestPassword);
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

/** 글 수정·삭제 공통: 글을 찾고 권한을 확인한다. */
async function authorizePost(
  postId: string,
  guestPassword?: string,
): Promise<{ ownerId: string | null } | { error: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return { error: NOT_FOUND_ERROR };

  const ownerId = (data as { user_id: string | null }).user_id;
  const user = await getUser();
  const deny = await manageDenyReason("posts", postId, ownerId, user?.id ?? null, guestPassword);
  return deny ? { error: deny } : { ownerId };
}

export async function deletePost(postId: string, guestPassword?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await authorizePost(postId, guestPassword);
  if ("error" in auth) return { success: false, error: auth.error };

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
  guestPassword?: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  const validationError = validatePostContent(title, content);
  if (validationError) return { success: false, error: validationError };

  const auth = await authorizePost(postId, guestPassword);
  if ("error" in auth) return { success: false, error: auth.error };

  const updates: Database["public"]["Tables"]["posts"]["Update"] = { title, content };
  if (imageUrl !== undefined) {
    const checked = safeImageUrl(imageUrl ?? "");
    // 허용되지 않는 이미지면 조용히 지우지 않고 저장 자체를 거부한다.
    if (checked === undefined) return { success: false, error: "첨부 이미지 주소가 올바르지 않습니다" };
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
  // 게스트 글은 색인 요청을 보내지 않는다 — 반복 수정으로 색인 API 할당량을 태울 수 있다.
  if (auth.ownerId) notifySearchEngines([`${COMMUNITY_PATH}/${postId}`, COMMUNITY_PATH]);
  return { success: true };
}
