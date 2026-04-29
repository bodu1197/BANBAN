// @client-reason: comment form interaction, delete/edit actions, like toggle
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Eye, Flag, Heart, MessageSquare, Pencil, Trash2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { STRINGS } from "@/lib/strings";
import { Button } from "@/components/ui/button";
import {
  createComment,
  deletePost,
  deleteComment,
  updateComment,
  togglePostLike,
  reportPost,
} from "@/lib/actions/community";
import type { CommunityPostDetail, PostComment } from "@/lib/supabase/community-queries";

const REPORT_REASONS = [
  { value: "SPAM", labelKey: "reportReasonSpam" },
  { value: "ABUSE", labelKey: "reportReasonAbuse" },
  { value: "ADULT", labelKey: "reportReasonAdult" },
  { value: "HATE", labelKey: "reportReasonHate" },
  { value: "OTHER", labelKey: "reportReasonOther" },
] as const;

const t = STRINGS.community;

const BOARD_LABEL_MAP: Record<string, string> = {
  PROCEDURE_REVIEW: t.procedureReview,
  COURSE_REVIEW: t.courseReview,
  SHOP_RECRUIT: t.shopRecruit,
  MODEL_RECRUIT: t.modelRecruit,
  QNA: t.qna,
  FREETALK: t.freeTalk,
  REVIEW: t.review,
};

function boardLabel(typeBoard: string): string {
  return BOARD_LABEL_MAP[typeBoard] ?? typeBoard;
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

interface PostDetailClientProps {
  post: CommunityPostDetail;
  userId: string | null;
  isAdmin: boolean;
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
      await deletePost(post.id);
    });
  }

  function handleLike(): void {
    if (!userId) {
      alert(t.loginRequired);
      return;
    }
    startTransition(async () => {
      await togglePostLike(post.id);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-[767px]">
      {/* Header */}
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

      {/* Post Content */}
      <article className="px-4 py-4">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {boardLabel(post.typeBoard)}
          </span>
        </div>

        <h2 className="mb-2 text-lg font-bold">{post.title}</h2>

        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{post.authorNickname ?? t.anonymous}</span>
          <span>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</span>
          <span className="flex items-center gap-0.5">
            <Eye className="h-3 w-3" aria-hidden="true" />
            {post.viewsCount}
          </span>
        </div>

        <div className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</div>

        {/* Attached Image */}
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

        {/* YouTube Embed */}
        {post.youtubeUrl ? (() => {
          const videoId = extractYoutubeId(post.youtubeUrl);
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

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={handleLike}
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
            onOpen={() => setShowReportModal(true)}
          />


          <div className="ml-auto flex gap-2">
            {canManage ? (
              <>
                <Link
                  href={`/community/${post.id}/edit`}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.edit}
                </Link>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.delete}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </article>

      {/* Comments Section */}
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

        {userId ? (
          <CommentForm postId={post.id} />
        ) : (
          <p className="px-4 py-4 text-center text-xs text-muted-foreground">{t.loginRequired}</p>
        )}
      </section>

      {showReportModal ? (
        <ReportModal
          postId={post.id}
          onClose={() => setShowReportModal(false)}
          onReported={() => {
            setShowReportModal(false);
            router.refresh();
          }}
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
      if (result.alreadyReported) {
        alert(t.reportAlready);
        onClose();
        return;
      }
      if (!result.success) {
        alert(t.reportFailed);
        return;
      }
      alert(t.reportSuccess);
      onReported();
    });
  }

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
      <div className="relative w-full max-w-md rounded-t-2xl bg-background p-5 shadow-xl md:rounded-2xl">
        <h2 id="report-modal-title" className="mb-1 text-base font-bold">{t.reportTitle}</h2>
        <p className="mb-4 text-xs text-muted-foreground">{t.reportDesc}</p>

        <fieldset className="mb-4 space-y-2">
          <legend className="sr-only">{t.reportTitle}</legend>
          {REPORT_REASONS.map((r) => (
            <label
              key={r.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary/5"
            >
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-brand-primary"
              />
              <span>{t[r.labelKey]}</span>
            </label>
          ))}
        </fieldset>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.reportDescriptionPlaceholder}
          rows={3}
          maxLength={500}
          className="mb-4 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            {STRINGS.common.cancel}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t.reportSubmit}
          </Button>
        </div>
      </div>
    </div>
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

/* ───── Comment Item ───── */

function CommentItem({
  comment,
  postId,
  userId,
  isAdmin,
  replies,
  isReply = false,
}: Readonly<{
  comment: PostComment;
  postId: string;
  userId: string | null;
  isAdmin: boolean;
  replies: readonly PostComment[];
  isReply?: boolean;
}>): React.ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isOwner = userId !== null && userId === comment.authorId;
  const canManage = isOwner || isAdmin;

  function handleDeleteComment(): void {
    if (!confirm(t.deleteConfirm)) return;
    startTransition(async () => {
      await deleteComment(comment.id);
      router.refresh();
    });
  }

  function handleUpdateComment(): void {
    startTransition(async () => {
      const result = await updateComment(comment.id, editContent);
      if (result.success) {
        setIsEditing(false);
        router.refresh();
      }
    });
  }

  return (
    <div className={cn("px-4 py-3", isReply && "ml-8 border-l-2 border-border/50")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium">{comment.authorNickname ?? t.anonymous}</span>
          <span className="text-muted-foreground">
            {new Date(comment.createdAt).toLocaleDateString("ko-KR")}
          </span>
        </div>

        {canManage ? (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="rounded p-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="댓글 수정"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={handleDeleteComment}
              disabled={isPending}
              className="rounded p-1 text-xs text-destructive transition-colors hover:text-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="댓글 삭제"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ) : null}
      </div>

      {isEditing ? (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            size="sm"
            onClick={handleUpdateComment}
            disabled={isPending || !editContent.trim()}
          >
            {STRINGS.common.save}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setIsEditing(false); setEditContent(comment.content); }}
          >
            {STRINGS.common.cancel}
          </Button>
        </div>
      ) : (
        <p className="mt-1 text-sm">{comment.content}</p>
      )}

      {/* Reply button */}
      {!isReply && userId ? (
        <button
          type="button"
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="mt-1.5 text-xs text-muted-foreground transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t.reply}
        </button>
      ) : null}

      {showReplyForm ? (
        <div className="mt-2">
          <CommentForm postId={postId} parentId={comment.id} onSubmitted={() => setShowReplyForm(false)} />
        </div>
      ) : null}

      {/* Nested replies */}
      {replies.length > 0 ? (
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
      ) : null}
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

  function handleSubmit(): void {
    if (!content.trim()) return;
    startTransition(async () => {
      const result = await createComment(postId, content.trim(), parentId);
      if (result.success) {
        setContent("");
        router.refresh();
        onSubmitted?.();
      }
    });
  }

  return (
    <div className="flex items-center gap-2 border-t border-border px-4 py-3">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t.writeComment}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSubmit(); }}
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !content.trim()}
        className="flex items-center gap-1 rounded-lg bg-brand-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        aria-label="댓글 등록"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {t.submitComment}
      </button>
    </div>
  );
}
