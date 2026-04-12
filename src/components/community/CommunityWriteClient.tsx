// @client-reason: form handling, submission, URL param reading
"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { createPost } from "@/lib/actions/community";

interface Props {
  labels: Record<string, string>;
  }

function WriteFormFields({ title, content, labels, onTitleChange, onContentChange }: Readonly<{
  title: string;
  content: string;
  labels: Record<string, string>;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
}>): React.ReactElement {
  return (
    <>
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder={labels.postTitlePlaceholder}
        className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-ring"
        required
      />
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={labels.postContentPlaceholder}
        rows={10}
        className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-ring"
        required
      />
    </>
  );
}

function getBoardLabel(board: string, labels: Record<string, string>): string {
  if (board === "FREETALK") return labels.freeTalk;
  return labels.qna;
}

export function CommunityWriteClient({ labels }: Readonly<Props>): React.ReactElement {
  const searchParams = useSearchParams();
  const board = searchParams.get("board") ?? "QNA";
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("content", content.trim());
      formData.set("type_board", board);
      formData.set("type_post", "GENERAL");
      const result = await createPost(formData);
      if (result.success && result.postId) {
        globalThis.location.href = `/community/${result.postId}`;
      }
    });
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">{getBoardLabel(board, labels)} {labels.writePost}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <WriteFormFields title={title} content={content} labels={labels} onTitleChange={setTitle} onContentChange={setContent} />
        <button type="submit" disabled={isPending || !title.trim() || !content.trim()} className="rounded-lg bg-brand-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          {isPending ? "..." : labels.submit}
        </button>
      </form>
    </div>
  );
}
