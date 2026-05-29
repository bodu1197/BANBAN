// @client-reason: 댓글 펼치기 토글 + 입력 폼 + 작성/삭제 서버액션 호출
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Trash2 } from "lucide-react";
import { createReviewComment, deleteReviewComment } from "@/lib/actions/reviews";
import type { ReviewComment } from "@/lib/supabase/queries";
import { formatRelativeTime } from "@/lib/utils/format-time";

interface ReviewCommentsProps {
  reviewId: string;
  comments: readonly ReviewComment[];
  userId: string | null;
}

function CommentRow({ comment, userId, nested, onReply, onDelete }: Readonly<{
  comment: ReviewComment; userId: string | null; nested: boolean;
  onReply: (id: string) => void; onDelete: (id: string) => void;
}>): React.ReactElement {
  return (
    <div className={nested ? "ml-5 border-l border-border pl-3" : ""}>
      <div className="flex items-start justify-between gap-2 py-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">{comment.authorNickname ?? "익명"}</span>
            <span className="text-[10px] text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">{comment.content}</p>
          {!nested && userId ? (
            <button
              type="button"
              onClick={() => onReply(comment.id)}
              className="mt-1 text-[10px] text-muted-foreground transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              답글
            </button>
          ) : null}
        </div>
        {userId === comment.authorId ? (
          <button
            type="button"
            onClick={() => onDelete(comment.id)}
            aria-label="댓글 삭제"
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CommentInput({ value, onChange, onSubmit, pending, placeholder }: Readonly<{
  value: string; onChange: (v: string) => void; onSubmit: () => void; pending: boolean; placeholder: string;
}>): React.ReactElement {
  return (
    <div className="mt-2 flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !pending) onSubmit(); }}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={500}
        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={pending || !value.trim()}
        className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        등록
      </button>
    </div>
  );
}

function CommentThread({ comments, userId, replyTo, replyText, pending, onReply, onDelete, onReplyTextChange, onReplySubmit }: Readonly<{
  comments: readonly ReviewComment[]; userId: string | null; replyTo: string | null; replyText: string; pending: boolean;
  onReply: (id: string) => void; onDelete: (id: string) => void;
  onReplyTextChange: (v: string) => void; onReplySubmit: (parentId: string) => void;
}>): React.ReactElement {
  const topLevel = comments.filter((c) => !c.parentId);
  if (topLevel.length === 0) {
    return <p className="text-xs text-muted-foreground">첫 댓글을 남겨보세요.</p>;
  }
  return (
    <div className="space-y-1">
      {topLevel.map((c) => (
        <div key={c.id}>
          <CommentRow comment={c} userId={userId} nested={false} onReply={onReply} onDelete={onDelete} />
          {comments.filter((r) => r.parentId === c.id).map((r) => (
            <CommentRow key={r.id} comment={r} userId={userId} nested onReply={onReply} onDelete={onDelete} />
          ))}
          {replyTo === c.id && userId ? (
            <div className="ml-5">
              <CommentInput value={replyText} onChange={onReplyTextChange} pending={pending}
                placeholder="답글 입력" onSubmit={() => onReplySubmit(c.id)} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CommentPanel({ comments, userId, text, replyTo, replyText, pending, onText, onReplyText, onReply, onDelete, onSubmitTop, onSubmitReply }: Readonly<{
  comments: readonly ReviewComment[]; userId: string | null;
  text: string; replyTo: string | null; replyText: string; pending: boolean;
  onText: (v: string) => void; onReplyText: (v: string) => void;
  onReply: (id: string) => void; onDelete: (id: string) => void;
  onSubmitTop: () => void; onSubmitReply: (parentId: string) => void;
}>): React.ReactElement {
  return (
    <div className="mt-2 rounded-lg bg-muted/30 p-3">
      <CommentThread
        comments={comments} userId={userId} replyTo={replyTo} replyText={replyText} pending={pending}
        onReply={onReply} onDelete={onDelete} onReplyTextChange={onReplyText} onReplySubmit={onSubmitReply}
      />
      {userId ? (
        <CommentInput value={text} onChange={onText} pending={pending} placeholder="댓글 입력" onSubmit={onSubmitTop} />
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">로그인 후 댓글을 작성할 수 있습니다.</p>
      )}
    </div>
  );
}

export function ReviewComments({ reviewId, comments, userId }: Readonly<ReviewCommentsProps>): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(content: string, parentId: string | undefined, reset: () => void): void {
    if (!content.trim()) return;
    startTransition(async () => {
      const res = await createReviewComment(reviewId, content, parentId);
      if (res.success) {
        reset();
        setReplyTo(null);
        router.refresh();
      } else {
        const msg = res.error === "unauthorized" ? "로그인 후 이용해주세요" : (res.error ?? "오류");
        toast.error(msg);
      }
    });
  }

  function remove(id: string): void {
    startTransition(async () => {
      const res = await deleteReviewComment(id);
      if (res.success) router.refresh();
      else toast.error(res.error ?? "오류");
    });
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
        댓글 {comments.length}
      </button>
      {open ? (
        <CommentPanel
          comments={comments} userId={userId} text={text} replyTo={replyTo} replyText={replyText} pending={pending}
          onText={setText} onReplyText={setReplyText} onReply={setReplyTo} onDelete={remove}
          onSubmitTop={() => submit(text, undefined, () => setText(""))}
          onSubmitReply={(parentId) => submit(replyText, parentId, () => setReplyText(""))}
        />
      ) : null}
    </div>
  );
}
