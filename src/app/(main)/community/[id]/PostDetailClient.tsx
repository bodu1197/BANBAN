// @client-reason: comment form interaction, delete/edit actions, like toggle
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Eye, Flag, Heart, MessageSquare, Pencil, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STRINGS } from "@/lib/strings";
import { REPORT_REASONS } from "@/lib/constants";
import { boardLabel } from "@/lib/board/constants";
import { extractYouTubeId } from "@/components/portfolio-form/media-upload";
import { Button } from "@/components/ui/button";
import { COMMENT_MAX } from "@/lib/post-limits";
import {
  createComment,
  deletePost,
  deleteComment,
  updateComment,
  togglePostLike,
  reportPost,
} from "@/lib/actions/community";
import type { CommunityPostDetail, PostComment } from "@/lib/supabase/community-queries";

const t = STRINGS.community;

interface PostDetailClientProps {
  post: CommunityPostDetail;
  userId: string | null;
  isAdmin: boolean;
}

/* ───── Post Article Content ───── */

function PostArticleContent({ post }: Readonly<{
  post: CommunityPostDetail;
}>): React.ReactElement {
  return (
    <>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {boardLabel(post.typeBoard)}
        </span>
      </div>

      <h2 className="mb-2 text-lg font-bold">{post.title}</h2>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{post.authorNickname ?? t.anonymous}</span>
        <span>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</span>
        <span className="flex items-center gap-0.5">
          <Eye className="h-3 w-3" aria-hidden="true" />
          {post.viewsCount}
        </span>
      </div>

      <div className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</div>

      {post.imageUrl ? (
        <div className="mt-4">
          <Image
            src={post.imageUrl}
            alt="첨부 이미지"
            width={600}
            height={400}
            className="w-full rounded-lg object-cover"
          />
        </div>
      ) : null}

      {post.youtubeUrl ? (() => {
        const videoId = extractYouTubeId(post.youtubeUrl);
        if (!videoId) return null;
        return (
          <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube 영상"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        );
      })() : null}
    </>
  );
}

/* ───── Manage Buttons (Edit / Delete) ───── */

function ManageButtons({ postId, isPending, onDelete }: Readonly<{
  postId: string;
  isPending: boolean;
  onDelete: () => void;
}>): React.ReactElement {
  return (
    <>
      <Link
        href={`/community/${postId}/edit`}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        {t.edit}
      </Link>
      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        {t.delete}
      </button>
    </>
  );
}

/* ───── Post Actions Bar ───── */

function PostActionsBar({ post, userId, isPending, isOwner, canManage, onLike, onDelete, onOpenReport }: Readonly<{
  post: CommunityPostDetail;
  userId: string | null;
  isPending: boolean;
  isOwner: boolean;
  canManage: boolean;
  onLike: () => void;
  onDelete: () => void;
  onOpenReport: () => void;
}>): React.ReactElement {
  return (
    <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
      <button
        type="button"
        onClick={onLike}
        disabled={isPending}
        className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-brand-primary/10 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Heart className="h-3.5 w-3.5" aria-hidden="true" />
        {t.likes} {post.likesCount}
      </button>

      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
        {t.comments} {post.commentsCount}
      </span>

      <ReportButton
        userId={userId}
        disabled={isPending || isOwner}
        count={post.reportsCount}
        onOpen={onOpenReport}
      />

      <div className="ml-auto flex gap-2">
        {canManage ? (
          <ManageButtons postId={post.id} isPending={isPending} onDelete={onDelete} />
        ) : null}
      </div>
    </div>
  );
}

/* ───── Post Header Navigation ───── */

function PostHeader(): React.ReactElement {
  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
      <Link
        href="/community"
        className="rounded-lg p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="뒤로 가기"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="flex-1 truncate text-base font-bold">{t.title}</h1>
    </div>
  );
}

/* ───── Comment Section ───── */

function CommentSection({ post, userId, isAdmin }: Readonly<{
  post: CommunityPostDetail;
  userId: string | null;
  isAdmin: boolean;
}>): React.ReactElement {
  return (
    <section className="border-t border-border" aria-label="댓글">
      <div className="px-4 py-3">
        <h3 className="text-sm font-bold">{t.comments} {post.commentsCount}</h3>
      </div>

      <CommentList
        comments={post.comments}
        postId={post.id}
        userId={userId}
        isAdmin={isAdmin}
      />

      {userId ? <CommentForm postId={post.id} /> : <CommentLoginPrompt postId={post.id} />}
    </section>
  );
}

/** 비로그인에게는 입력창 대신 로그인 안내를 보여준다 — 댓글도 회원 전용이다. */
function CommentLoginPrompt({ postId }: Readonly<{ postId: string }>): React.ReactElement {
  return (
    <div className="border-t border-border px-4 py-4 text-center">
      <p className="mb-2 text-xs text-muted-foreground">{t.commentLoginRequired}</p>
      <Link
        // 로그인 후 읽던 글로 되돌아온다 — 홈으로 떨어뜨리면 글을 다시 찾아야 한다.
        href={`/login?next=${encodeURIComponent(`/community/${postId}`)}`}
        className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t.loginToComment}
      </Link>
    </div>
  );
}

/* ───── Post Article ───── */

function PostArticle({ post, userId, isPending, isOwner, canManage, onLike, onDelete, onOpenReport }: Readonly<{
  post: CommunityPostDetail;
  userId: string | null;
  isPending: boolean;
  isOwner: boolean;
  canManage: boolean;
  onLike: () => void;
  onDelete: () => void;
  onOpenReport: () => void;
}>): React.ReactElement {
  return (
    <article className="px-4 py-4">
      <PostArticleContent post={post} />
      <PostActionsBar
        post={post}
        userId={userId}
        isPending={isPending}
        isOwner={isOwner}
        canManage={canManage}
        onLike={onLike}
        onDelete={onDelete}
        onOpenReport={onOpenReport}
      />
    </article>
  );
}

export function PostDetailClient({
  post,
  userId,
  isAdmin,
}: Readonly<PostDetailClientProps>): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReportModal, setShowReportModal] = useState(false);
  const isOwner = userId !== null && userId === post.authorId;
  const canManage = isOwner || isAdmin;

  function handleDelete(): void {
    if (!confirm(t.deleteConfirm)) return;
    startTransition(async () => {
      const result = await deletePost(post.id);
      if (result?.error) toast.error(result.error);
    });
  }

  function handleLike(): void {
    if (!userId) { alert(t.loginRequired); return; }
    startTransition(async () => {
      const result = await togglePostLike(post.id);
      if (result.error) toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1024px]">
      <PostHeader />
      <PostArticle
        post={post} userId={userId} isPending={isPending}
        isOwner={isOwner} canManage={canManage}
        onLike={handleLike} onDelete={handleDelete}
        onOpenReport={() => setShowReportModal(true)}
      />
      <CommentSection post={post} userId={userId} isAdmin={isAdmin} />
      {showReportModal ? (
        <ReportModal
          postId={post.id}
          onClose={() => setShowReportModal(false)}
          onReported={() => { setShowReportModal(false); router.refresh(); }}
        />
      ) : null}
    </div>
  );
}

/* ───── Report Button ───── */

function ReportButton({
  userId,
  disabled,
  count,
  onOpen,
}: Readonly<{
  userId: string | null;
  disabled: boolean;
  count: number;
  onOpen: () => void;
}>): React.ReactElement {
  function handleClick(): void {
    if (!userId) {
      alert(t.loginRequired);
      return;
    }
    onOpen();
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      aria-label={t.report}
    >
      <Flag className="h-3.5 w-3.5" aria-hidden="true" />
      {t.report} {count}
    </button>
  );
}

/* ───── Report Reason Fieldset ───── */

function ReportReasonFieldset({ reason, onReasonChange }: Readonly<{
  reason: string;
  onReasonChange: (value: string) => void;
}>): React.ReactElement {
  return (
    <fieldset className="mb-4 space-y-2">
      <legend className="sr-only">{t.reportTitle}</legend>
      {REPORT_REASONS.map((r) => (
        <label
          key={r.value}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary/5"
        >
          <input
            type="radio"
            name="report-reason"
            value={r.value}
            checked={reason === r.value}
            onChange={() => onReasonChange(r.value)}
            className="accent-brand-primary"
          />
          <span>{r.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

/* ───── Report Actions ───── */

function ReportActions({ isPending, onClose, onSubmit }: Readonly<{
  isPending: boolean;
  onClose: () => void;
  onSubmit: () => void;
}>): React.ReactElement {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
        {STRINGS.common.cancel}
      </Button>
      <Button
        size="sm"
        onClick={onSubmit}
        disabled={isPending}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {t.reportSubmit}
      </Button>
    </div>
  );
}

/* ───── Report Modal Content ───── */

function ReportModalContent({ reason, description, isPending, onReasonChange, onDescriptionChange, onClose, onSubmit }: Readonly<{
  reason: string;
  description: string;
  isPending: boolean;
  onReasonChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}>): React.ReactElement {
  return (
    <div className="relative w-full max-w-md rounded-t-2xl bg-background p-5 shadow-xl md:rounded-2xl">
      <h2 id="report-modal-title" className="mb-1 text-base font-bold">{t.reportTitle}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{t.reportDesc}</p>

      <ReportReasonFieldset reason={reason} onReasonChange={onReasonChange} />

      <textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder={t.reportDescriptionPlaceholder}
        rows={3}
        maxLength={500}
        className="mb-4 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <ReportActions isPending={isPending} onClose={onClose} onSubmit={onSubmit} />
    </div>
  );
}

/* ───── Report Modal Overlay ───── */

function ReportModalOverlay({ onClose, children }: Readonly<{
  onClose: () => void;
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4"
    >
      <button
        type="button"
        aria-label={STRINGS.common.close}
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      {children}
    </div>
  );
}

/* ───── Report Modal ───── */

function ReportModal({
  postId,
  onClose,
  onReported,
}: Readonly<{
  postId: string;
  onClose: () => void;
  onReported: () => void;
}>): React.ReactElement {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].value);
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(): void {
    startTransition(async () => {
      const result = await reportPost(postId, reason, description);
      if (result.alreadyReported) { alert(t.reportAlready); onClose(); return; }
      if (!result.success) { alert(t.reportFailed); return; }
      alert(t.reportSuccess);
      onReported();
    });
  }

  return (
    <ReportModalOverlay onClose={onClose}>
      <ReportModalContent
        reason={reason} description={description} isPending={isPending}
        onReasonChange={setReason} onDescriptionChange={setDescription}
        onClose={onClose} onSubmit={handleSubmit}
      />
    </ReportModalOverlay>
  );
}

/* ───── Comment List ───── */

function CommentList({
  comments,
  postId,
  userId,
  isAdmin,
}: Readonly<{
  comments: readonly PostComment[];
  postId: string;
  userId: string | null;
  isAdmin: boolean;
}>): React.ReactElement {
  const rootComments = comments.filter((c) => !c.parentId);
  const childMap = new Map<string, PostComment[]>();
  for (const c of comments) {
    if (c.parentId) {
      const arr = childMap.get(c.parentId) ?? [];
      arr.push(c);
      childMap.set(c.parentId, arr);
    }
  }

  return (
    <ul className="divide-y divide-border/50">
      {rootComments.map((comment) => (
        <li key={comment.id}>
          <CommentItem
            comment={comment}
            postId={postId}
            userId={userId}
            isAdmin={isAdmin}
            replies={childMap.get(comment.id) ?? []}
          />
        </li>
      ))}
    </ul>
  );
}

/* ───── Comment Header ───── */

function CommentHeader({ comment, canManage, isPending, onToggleEdit, onDelete }: Readonly<{
  comment: PostComment;
  canManage: boolean;
  isPending: boolean;
  onToggleEdit: () => void;
  onDelete: () => void;
}>): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-foreground">{comment.authorNickname ?? t.anonymous}</span>
        <span className="text-muted-foreground">
          {new Date(comment.createdAt).toLocaleDateString("ko-KR")}
        </span>
      </div>

      {canManage ? (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onToggleEdit}
            className="rounded p-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="댓글 수정"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="rounded p-1 text-xs text-destructive transition-colors hover:text-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="댓글 삭제"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ───── Comment Edit Form ───── */

function CommentEditForm({ editContent, isPending, onContentChange, onSave, onCancel }: Readonly<{
  editContent: string;
  isPending: boolean;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}>): React.ReactElement {
  return (
    <div className="mt-2 flex gap-2">
      <input
        type="text"
        value={editContent}
        onChange={(e) => onContentChange(e.target.value)}
        maxLength={COMMENT_MAX}
        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button
        size="sm"
        onClick={onSave}
        disabled={isPending || !editContent.trim()}
      >
        {STRINGS.common.save}
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        {STRINGS.common.cancel}
      </Button>
    </div>
  );
}

/* ───── Comment Body ───── */

function CommentBody({ content, showReplyButton, onToggleReply }: Readonly<{
  content: string;
  showReplyButton: boolean;
  onToggleReply: () => void;
}>): React.ReactElement {
  return (
    <>
      <p className="mt-1 text-sm">{content}</p>
      {showReplyButton ? (
        <button
          type="button"
          onClick={onToggleReply}
          className="mt-1.5 text-xs text-muted-foreground transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t.reply}
        </button>
      ) : null}
    </>
  );
}

/* ───── Comment Replies ───── */

function CommentReplies({ replies, postId, userId, isAdmin }: Readonly<{
  replies: readonly PostComment[];
  postId: string;
  userId: string | null;
  isAdmin: boolean;
}>): React.ReactElement | null {
  if (replies.length === 0) return null;
  return (
    <ul>
      {replies.map((reply) => (
        <li key={reply.id}>
          <CommentItem
            comment={reply}
            postId={postId}
            userId={userId}
            isAdmin={isAdmin}
            replies={[]}
            isReply
          />
        </li>
      ))}
    </ul>
  );
}

/* ───── Comment Actions Hook ───── */

interface CommentActions {
  isEditing: boolean;
  editContent: string;
  isPending: boolean;
  setEditContent: (value: string) => void;
  handleDelete: () => void;
  handleUpdate: () => void;
  cancelEdit: () => void;
  toggleEdit: () => void;
}

function useCommentActions(commentId: string, content: string): CommentActions {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: "delete" | "update"): void {
    startTransition(async () => {
      const result = action === "delete"
        ? await deleteComment(commentId)
        : await updateComment(commentId, editContent);
      if (!result.success) { if (result.error) toast.error(result.error); return; }
      if (action === "update") setIsEditing(false);
      router.refresh();
    });
  }

  function handleDelete(): void {
    if (!confirm(t.deleteConfirm)) return;
    run("delete");
  }

  function cancelEdit(): void { setIsEditing(false); setEditContent(content); }
  function toggleEdit(): void { setIsEditing((prev) => !prev); }

  return {
    isEditing, editContent, isPending,
    setEditContent,
    handleDelete,
    handleUpdate: () => run("update"),
    cancelEdit, toggleEdit,
  };
}

/* ───── Comment Item ───── */

function CommentItem({
  comment, postId, userId, isAdmin, replies, isReply = false,
}: Readonly<{
  comment: PostComment;
  postId: string;
  userId: string | null;
  isAdmin: boolean;
  replies: readonly PostComment[];
  isReply?: boolean;
}>): React.ReactElement {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const actions = useCommentActions(comment.id, comment.content);
  const canManage = (userId !== null && userId === comment.authorId) || isAdmin;

  return (
    <div className={cn("px-4 py-3", isReply && "ml-8 border-l-2 border-border/50")}>
      <CommentHeader
        comment={comment} canManage={canManage} isPending={actions.isPending}
        onToggleEdit={actions.toggleEdit} onDelete={actions.handleDelete}
      />
      {actions.isEditing ? (
        <CommentEditForm
          editContent={actions.editContent} isPending={actions.isPending}
          onContentChange={actions.setEditContent} onSave={actions.handleUpdate}
          onCancel={actions.cancelEdit}
        />
      ) : (
        <CommentBody
          content={comment.content}
          // 답글도 회원 전용 — 비로그인에게는 버튼 자체를 보이지 않는다.
          showReplyButton={!isReply && userId !== null}
          onToggleReply={() => setShowReplyForm(!showReplyForm)}
        />
      )}
      {showReplyForm ? (
        <div className="mt-2">
          <CommentForm
            postId={postId} parentId={comment.id}
            onSubmitted={() => setShowReplyForm(false)}
          />
        </div>
      ) : null}
      <CommentReplies replies={replies} postId={postId} userId={userId} isAdmin={isAdmin} />
    </div>
  );
}

/* ───── Comment Form ───── */

function CommentForm({
  postId,
  parentId,
  onSubmitted,
}: Readonly<{
  postId: string;
  parentId?: string;
  onSubmitted?: () => void;
}>): React.ReactElement {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canSubmit = Boolean(content.trim());

  function handleSubmit(): void {
    if (!canSubmit) return;
    startTransition(async () => {
      const result = await createComment(postId, content.trim(), parentId);
      if (result.success) {
        setContent("");
        router.refresh();
        onSubmitted?.();
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t.writeComment}
          maxLength={COMMENT_MAX}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSubmit(); }}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !canSubmit}
          className="flex items-center gap-1 rounded-lg bg-brand-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          aria-label="댓글 등록"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {t.submitComment}
        </button>
      </div>
    </div>
  );
}
