// @client-reason: comment form interaction, delete/edit actions, like toggle
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Eye, Flag, Heart, Lock, MessageSquare, Pencil, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STRINGS } from "@/lib/strings";
import { REPORT_REASONS } from "@/lib/constants";
import { boardLabel } from "@/lib/board/constants";
import { extractYouTubeId } from "@/components/portfolio-form/media-upload";
import { Button } from "@/components/ui/button";
import { GuestFields, GuestBadge } from "@/components/community/GuestFields";
import { GuestPasswordDialog } from "@/components/community/GuestPasswordDialog";
import { isGuestReady } from "@/lib/guest-limits";
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
  /** 게시글·댓글 id → 작성 IP. 관리자에게만 채워져서 내려온다. */
  guestIps: Readonly<Record<string, string>>;
}

/**
 * 비밀번호 확인이 필요한 동작을 붙잡아 두는 훅.
 * 게스트 글이면 모달을 띄우고, 아니면 곧바로 실행한다.
 */
function useGuestGate(needsPassword: boolean, run: (password?: string) => void): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  confirm: (password: string) => void;
} {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    open: () => (needsPassword ? setIsOpen(true) : run()),
    close: () => setIsOpen(false),
    confirm: (password: string) => { setIsOpen(false); run(password); },
  };
}

/* ───── Author Line (작성자 · 비회원 표시 · 관리자에게만 IP) ───── */

function AuthorLine({ nickname, isGuest, ip }: Readonly<{
  nickname: string | null;
  isGuest: boolean;
  ip?: string;
}>): React.ReactElement {
  return (
    <>
      <span className="font-medium text-foreground">{nickname ?? t.anonymous}</span>
      {isGuest ? <GuestBadge /> : null}
      {/* 관리자 전용 — 비회원 배지와 헷갈리지 않게 테두리로 구분한다 */}
      {ip ? (
        <span className="rounded border border-destructive/40 px-1 py-0.5 text-[10px] text-destructive">
          {t.authorIp} {ip}
        </span>
      ) : null}
    </>
  );
}

/* ───── Post Article Content ───── */

function PostArticleContent({ post, authorIp }: Readonly<{
  post: CommunityPostDetail;
  authorIp?: string;
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
        <AuthorLine nickname={post.authorNickname} isGuest={post.isGuest} ip={authorIp} />
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

function ManageButtons({ postId, isPending, needsPassword, onDelete }: Readonly<{
  postId: string;
  isPending: boolean;
  needsPassword: boolean;
  onDelete: () => void;
}>): React.ReactElement {
  // 비회원 글은 누구에게나 버튼이 보이므로, 비밀번호가 필요하다는 사실을 미리 알려준다.
  const hint = needsPassword ? t.guestManageHint : undefined;
  return (
    <>
      <Link
        href={`/community/${postId}/edit`}
        title={hint}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {needsPassword ? <Lock className="h-3 w-3" aria-hidden="true" /> : <Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
        {t.edit}
      </Link>
      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        title={hint}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {needsPassword ? <Lock className="h-3 w-3" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
        {t.delete}
      </button>
    </>
  );
}

/* ───── Post Actions Bar ───── */

function PostActionsBar({ post, userId, isPending, isOwner, canManage, needsPassword, onLike, onDelete, onOpenReport }: Readonly<{
  post: CommunityPostDetail;
  userId: string | null;
  isPending: boolean;
  isOwner: boolean;
  canManage: boolean;
  needsPassword: boolean;
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
          <ManageButtons postId={post.id} isPending={isPending} needsPassword={needsPassword} onDelete={onDelete} />
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

function CommentSection({ post, userId, isAdmin, guestIps }: Readonly<{
  post: CommunityPostDetail;
  userId: string | null;
  isAdmin: boolean;
  guestIps: Readonly<Record<string, string>>;
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
        guestIps={guestIps}
      />

      <CommentForm postId={post.id} isGuest={userId === null} />
    </section>
  );
}

/* ───── Post Article ───── */

function PostArticle({ post, userId, isPending, isOwner, canManage, needsPassword, authorIp, onLike, onDelete, onOpenReport }: Readonly<{
  post: CommunityPostDetail;
  userId: string | null;
  isPending: boolean;
  isOwner: boolean;
  canManage: boolean;
  needsPassword: boolean;
  authorIp?: string;
  onLike: () => void;
  onDelete: () => void;
  onOpenReport: () => void;
}>): React.ReactElement {
  return (
    <article className="px-4 py-4">
      <PostArticleContent post={post} authorIp={authorIp} />
      <PostActionsBar
        post={post}
        userId={userId}
        isPending={isPending}
        isOwner={isOwner}
        canManage={canManage}
        needsPassword={needsPassword}
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
  guestIps,
}: Readonly<PostDetailClientProps>): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReportModal, setShowReportModal] = useState(false);
  const isOwner = userId !== null && userId === post.authorId;
  // 게스트 글은 누구에게나 수정/삭제 버튼이 보이되, 실제 실행은 비밀번호로 막힌다.
  const canManage = isOwner || isAdmin || post.isGuest;
  const needsGuestPassword = post.isGuest && !isAdmin;

  const runDelete = (password?: string): void => {
    startTransition(async () => {
      const result = await deletePost(post.id, password);
      if (result?.error) toast.error(result.error);
    });
  };
  const deleteGate = useGuestGate(needsGuestPassword, runDelete);

  function handleDelete(): void {
    // 게스트는 비밀번호 모달이 곧 확인 절차다 — 인앱 브라우저에서 막히는 confirm 을 앞에 두지 않는다.
    if (!needsGuestPassword && !confirm(t.deleteConfirm)) return;
    deleteGate.open();
  }

  function handleLike(): void {
    if (!userId) { alert(t.loginRequired); return; }
    startTransition(async () => { await togglePostLike(post.id); router.refresh(); });
  }

  return (
    <div className="mx-auto w-full max-w-[1024px]">
      <PostHeader />
      <PostArticle
        post={post} userId={userId} isPending={isPending}
        isOwner={isOwner} canManage={canManage} needsPassword={needsGuestPassword}
        authorIp={guestIps[post.id]}
        onLike={handleLike} onDelete={handleDelete}
        onOpenReport={() => setShowReportModal(true)}
      />
      <CommentSection post={post} userId={userId} isAdmin={isAdmin} guestIps={guestIps} />
      {deleteGate.isOpen ? (
        <GuestPasswordDialog
          title={t.guestConfirmDelete}
          confirmLabel={t.delete}
          isPending={isPending}
          onCancel={deleteGate.close}
          onConfirm={deleteGate.confirm}
        />
      ) : null}
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
  guestIps,
}: Readonly<{
  comments: readonly PostComment[];
  postId: string;
  userId: string | null;
  isAdmin: boolean;
  guestIps: Readonly<Record<string, string>>;
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
            guestIps={guestIps}
            replies={childMap.get(comment.id) ?? []}
          />
        </li>
      ))}
    </ul>
  );
}

/* ───── Comment Header ───── */

function CommentHeader({ comment, canManage, isPending, needsPassword, ip, onToggleEdit, onDelete }: Readonly<{
  comment: PostComment;
  canManage: boolean;
  isPending: boolean;
  needsPassword: boolean;
  ip?: string;
  onToggleEdit: () => void;
  onDelete: () => void;
}>): React.ReactElement {
  const hint = needsPassword ? t.guestManageHint : undefined;
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <AuthorLine nickname={comment.authorNickname} isGuest={comment.isGuest} ip={ip} />
        <span className="text-muted-foreground">
          {new Date(comment.createdAt).toLocaleDateString("ko-KR")}
        </span>
      </div>

      {canManage ? (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onToggleEdit}
            title={hint}
            className="rounded p-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="댓글 수정"
          >
            {needsPassword ? <Lock className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            title={hint}
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

function CommentReplies({ replies, postId, userId, isAdmin, guestIps }: Readonly<{
  replies: readonly PostComment[];
  postId: string;
  userId: string | null;
  isAdmin: boolean;
  guestIps: Readonly<Record<string, string>>;
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
            guestIps={guestIps}
            replies={[]}
            isReply
          />
        </li>
      ))}
    </ul>
  );
}

/* ───── Comment Actions Hook ───── */

type CommentGateAction = "delete" | "update";

interface CommentActions {
  isEditing: boolean;
  editContent: string;
  isPending: boolean;
  /** 비밀번호 모달이 열려 있는 동작. 진실은 이 하나뿐이다(게이트 2개로 나누면 한쪽이 남는다). */
  openAction: CommentGateAction | null;
  setEditContent: (value: string) => void;
  handleDelete: () => void;
  handleUpdate: () => void;
  closeGate: () => void;
  confirmGate: (password: string) => void;
  cancelEdit: () => void;
  toggleEdit: () => void;
}

function useCommentActions(commentId: string, content: string, needsGuestPassword: boolean): CommentActions {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isPending, startTransition] = useTransition();
  const [openAction, setOpenAction] = useState<CommentGateAction | null>(null);
  const router = useRouter();

  function run(action: CommentGateAction, password?: string): void {
    startTransition(async () => {
      const result = action === "delete"
        ? await deleteComment(commentId, password)
        : await updateComment(commentId, editContent, password);
      if (!result.success) { if (result.error) toast.error(result.error); return; }
      if (action === "update") setIsEditing(false);
      router.refresh();
    });
  }

  /** 비회원 댓글이면 비밀번호를 먼저 받고, 아니면 바로 실행한다. */
  function start(action: CommentGateAction): void {
    if (needsGuestPassword) setOpenAction(action);
    else run(action);
  }

  function handleDelete(): void {
    if (!needsGuestPassword && !confirm(t.deleteConfirm)) return;
    start("delete");
  }

  function cancelEdit(): void { setIsEditing(false); setEditContent(content); }
  function toggleEdit(): void { setIsEditing((prev) => !prev); }

  return {
    isEditing, editContent, isPending, openAction,
    setEditContent,
    handleDelete,
    handleUpdate: () => start("update"),
    closeGate: () => setOpenAction(null),
    confirmGate: (password: string) => {
      const action = openAction;
      setOpenAction(null);
      if (action) run(action, password);
    },
    cancelEdit, toggleEdit,
  };
}

/** 댓글 수정·삭제 전 비밀번호 확인 모달 (열려 있을 때만 렌더) */
function CommentPasswordDialog({ openAction, isPending, onCancel, onConfirm }: Readonly<{
  openAction: CommentGateAction | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (password: string) => void;
}>): React.ReactElement | null {
  if (!openAction) return null;
  return (
    <GuestPasswordDialog
      title={openAction === "delete" ? t.guestConfirmDelete : t.guestConfirmEdit}
      confirmLabel={openAction === "delete" ? t.delete : t.edit}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

/* ───── Comment Item ───── */

function CommentItem({
  comment, postId, userId, isAdmin, guestIps, replies, isReply = false,
}: Readonly<{
  comment: PostComment;
  postId: string;
  userId: string | null;
  isAdmin: boolean;
  guestIps: Readonly<Record<string, string>>;
  replies: readonly PostComment[];
  isReply?: boolean;
}>): React.ReactElement {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const needsGuestPassword = comment.isGuest && !isAdmin;
  const actions = useCommentActions(comment.id, comment.content, needsGuestPassword);
  const canManage = (userId !== null && userId === comment.authorId) || isAdmin || comment.isGuest;

  return (
    <div className={cn("px-4 py-3", isReply && "ml-8 border-l-2 border-border/50")}>
      <CommentHeader
        comment={comment} canManage={canManage} isPending={actions.isPending}
        needsPassword={needsGuestPassword} ip={guestIps[comment.id]}
        onToggleEdit={actions.toggleEdit} onDelete={actions.handleDelete}
      />
      <CommentPasswordDialog
        openAction={actions.openAction} isPending={actions.isPending}
        onCancel={actions.closeGate} onConfirm={actions.confirmGate}
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
          showReplyButton={!isReply}
          onToggleReply={() => setShowReplyForm(!showReplyForm)}
        />
      )}
      {showReplyForm ? (
        <div className="mt-2">
          <CommentForm
            postId={postId} parentId={comment.id} isGuest={userId === null}
            onSubmitted={() => setShowReplyForm(false)}
          />
        </div>
      ) : null}
      <CommentReplies replies={replies} postId={postId} userId={userId} isAdmin={isAdmin} guestIps={guestIps} />
    </div>
  );
}

/* ───── Comment Form ───── */

function CommentForm({
  postId,
  parentId,
  isGuest,
  onSubmitted,
}: Readonly<{
  postId: string;
  parentId?: string;
  isGuest: boolean;
  onSubmitted?: () => void;
}>): React.ReactElement {
  const [content, setContent] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canSubmit = Boolean(content.trim()) && (!isGuest || isGuestReady(guestName, guestPassword));

  function handleSubmit(): void {
    if (!canSubmit) return;
    startTransition(async () => {
      const guest = isGuest ? { name: guestName.trim(), password: guestPassword } : undefined;
      const result = await createComment(postId, content.trim(), parentId, guest);
      if (result.success) {
        setContent("");
        setGuestPassword("");
        router.refresh();
        onSubmitted?.();
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="border-t border-border px-4 py-3">
      {isGuest ? (
        <GuestFields
          idPrefix={`comment-${parentId ?? "root"}`}
          name={guestName}
          password={guestPassword}
          onNameChange={setGuestName}
          onPasswordChange={setGuestPassword}
        />
      ) : null}
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
