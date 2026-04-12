// @client-reason: like toggle, comment form, interactive actions
"use client";

import { useState, useTransition } from "react";
import { Eye, Heart, MessageCircle, User, Trash2, Pencil, Reply } from "lucide-react";
import { createComment, togglePostLike, deletePost, updatePost } from "@/lib/actions/community";
import type { CommunityPostDetail, PostComment } from "@/lib/supabase/community-queries";

interface Props {
  post: CommunityPostDetail;
  isLiked: boolean;
  userId: string | null;
  isAdmin?: boolean;
  labels: Record<string, string>;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const parts = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const get = (t: string): string => parts.find(p => p.type === t)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`;
}

function CommentItem({ comment, labels, userId, onReply }: Readonly<{
  comment: PostComment;
  labels: Record<string, string>;
  userId: string | null;
  onReply: (parentId: string) => void;
}>): React.ReactElement {
  return (
    <div className={`${comment.parentId ? "ml-8 border-l-2 border-muted pl-4" : ""}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
          <User className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        </div>
        <span className="text-sm font-medium">
          {comment.authorNickname ?? labels.anonymous}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDate(comment.createdAt)}
        </span>
      </div>
      <p className="mb-2 text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
      {userId && !comment.parentId ? (
        <button
          type="button"
          onClick={() => onReply(comment.id)}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Reply className="h-3 w-3" aria-hidden="true" />
          {labels.reply}
        </button>
      ) : null}
    </div>
  );
}

function PostModifyButtons({ labels, onEdit, onDelete }: Readonly<{
  labels: Record<string, string>; onEdit: () => void; onDelete: () => void;
}>): React.ReactElement {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onEdit} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={labels.edit ?? "수정"}>
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={onDelete} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={labels.delete}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function PostHeader({ post, labels, canModify, onEdit, onDelete }: Readonly<{
  post: CommunityPostDetail; labels: Record<string, string>; canModify: boolean; onEdit: () => void; onDelete: () => void;
}>): React.ReactElement {
  const boardLabel = post.typeBoard === "QNA" ? labels.qna : labels.freeTalk;
  const boardClass = post.typeBoard === "QNA" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700";
  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${boardClass}`}>{boardLabel}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {post.typePost === "TATTOO" ? labels.tattoo : labels.beauty}
        </span>
      </div>
      <h1 className="mb-3 text-lg font-bold">{post.title}</h1>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium">{post.authorNickname ?? labels.anonymous}</p>
            <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
          </div>
        </div>
        {canModify ? <PostModifyButtons labels={labels} onEdit={onEdit} onDelete={onDelete} /> : null}
      </div>
    </>
  );
}

function PostActions({ viewsCount, likesCount, commentsCount, isLiked, userId, labels, isPending, onLike }: Readonly<{
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  userId: string | null;
  labels: Record<string, string>;
  isPending: boolean;
  onLike: () => void;
}>): React.ReactElement {
  return (
    <div className="flex items-center gap-4 border-t border-border pt-3">
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <Eye className="h-4 w-4" aria-hidden="true" />
        {viewsCount}
      </span>
      <button
        type="button"
        onClick={onLike}
        disabled={!userId || isPending}
        className={`flex items-center gap-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
        }`}
        aria-label={labels.likes}
        aria-pressed={isLiked}
      >
        <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} aria-hidden="true" />
        {likesCount}
      </button>
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {commentsCount}
      </span>
    </div>
  );
}

function CommentForm({ labels, commentText, replyTo, isPending, onTextChange, onClearReply, onSubmit }: Readonly<{
  labels: Record<string, string>;
  commentText: string;
  replyTo: string | null;
  isPending: boolean;
  onTextChange: (v: string) => void;
  onClearReply: () => void;
  onSubmit: (e: React.FormEvent) => void;
}>): React.ReactElement {
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <div className="flex-1">
        {replyTo ? (
          <div className="mb-1 flex items-center gap-1">
            <span className="text-xs text-brand-primary">{labels.reply}</span>
            <button type="button" onClick={onClearReply} className="text-xs text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">✕</button>
          </div>
        ) : null}
        <input
          type="text"
          value={commentText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={labels.writeComment}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !commentText.trim()}
        className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {labels.submitComment}
      </button>
    </form>
  );
}

function CommentsList({ comments, labels, userId, onReply }: Readonly<{
  comments: PostComment[];
  labels: Record<string, string>;
  userId: string | null;
  onReply: (id: string) => void;
}>): React.ReactElement {
  const topComments = comments.filter((c) => !c.parentId);
  const replies = comments.filter((c) => c.parentId);
  return (
    <div className="mb-4 flex flex-col gap-4">
      {topComments.map((comment) => (
        <div key={comment.id}>
          <CommentItem comment={comment} labels={labels} userId={userId} onReply={onReply} />
          {replies.filter((r) => r.parentId === comment.id).map((reply) => (
            <div key={reply.id} className="mt-2">
              <CommentItem comment={reply} labels={labels} userId={userId} onReply={onReply} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* eslint-disable max-lines-per-function */
export function CommunityDetailClient({ post, isLiked: initialIsLiked, userId, isAdmin: admin = false, labels }: Readonly<Props>): React.ReactElement {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editContent, setEditContent] = useState(post.content);

  const canModify = userId === post.authorId || admin;

  function handleLike(): void {
    if (!userId) return;
    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount((prev) => prev + (wasLiked ? -1 : 1));
    startTransition(async () => {
      const result = await togglePostLike(post.id);
      if (!result.success) { setIsLiked(wasLiked); setLikesCount((prev) => prev + (wasLiked ? 1 : -1)); }
    });
  }

  function handleSubmitComment(e: React.FormEvent): void {
    e.preventDefault();
    if (!commentText.trim() || !userId) return;
    startTransition(async () => {
      const result = await createComment(post.id, commentText.trim(), replyTo ?? undefined);
      if (result.success) { setCommentText(""); setReplyTo(null); }
    });
  }

  function handleDelete(): void {
    if (!confirm(labels.deleteConfirm)) return;
    startTransition(async () => {
      await deletePost(post.id);
    });
  }

  function handleEdit(): void {
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditing(true);
  }

  function handleSaveEdit(): void {
    if (!editTitle.trim() || !editContent.trim()) return;
    startTransition(async () => {
      const result = await updatePost(post.id, editTitle.trim(), editContent.trim());
      if (result.success) {
        setEditing(false);
        globalThis.location.reload();
      }
    });
  }

  return (
    <div>
      <article className="mb-6">
        <PostHeader post={post} labels={labels} canModify={canModify} onEdit={handleEdit} onDelete={handleDelete} />
        {editing ? (
          <div className="mb-4 space-y-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isPending}
                className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {labels.save ?? "저장"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {labels.cancel ?? "취소"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 whitespace-pre-wrap text-sm leading-relaxed">{post.content}</div>
        )}
        <PostActions viewsCount={post.viewsCount} likesCount={likesCount} commentsCount={post.commentsCount} isLiked={isLiked} userId={userId} labels={labels} isPending={isPending} onLike={handleLike} />
      </article>
      <section>
        <h2 className="mb-4 text-sm font-bold">{labels.comments} ({post.comments.length})</h2>
        <CommentsList comments={post.comments} labels={labels} userId={userId} onReply={setReplyTo} />
        {userId ? (
          <CommentForm labels={labels} commentText={commentText} replyTo={replyTo} isPending={isPending} onTextChange={setCommentText} onClearReply={() => setReplyTo(null)} onSubmit={handleSubmitComment} />
        ) : (
          <p className="text-center text-sm text-muted-foreground">{labels.loginRequired}</p>
        )}
      </section>
    </div>
  );
}
