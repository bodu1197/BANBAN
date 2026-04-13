// @client-reason: form state management, form submission
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { STRINGS } from "@/lib/strings";
import { Button } from "@/components/ui/button";
import { createPost } from "@/lib/actions/community";

const t = STRINGS.community;

const BOARD_OPTIONS = [
  { key: "FREETALK", label: t.freeTalk },
  { key: "QNA", label: t.qna },
  { key: "REVIEW", label: t.review },
] as const;

export function PostWriteClient(): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [board, setBoard] = useState("FREETALK");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  function handleSubmit(): void {
    if (!title.trim() || !content.trim()) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("content", content.trim());
      formData.set("type_board", board);

      const result = await createPost(formData);
      if (result.success && result.postId) {
        router.push(`/community/${result.postId}`);
      }
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
        <h1 className="flex-1 text-base font-bold">{t.writePost}</h1>
      </div>

      <div className="px-4 py-4">
        {/* Board Selection */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium">{t.selectCategory}</label>
          <div className="flex gap-2">
            {BOARD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setBoard(opt.key)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  "hover:bg-brand-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  board === opt.key
                    ? "bg-brand-primary text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label htmlFor="post-title" className="mb-1.5 block text-sm font-medium">
            {t.postTitle}
          </label>
          <input
            id="post-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.postTitlePlaceholder}
            maxLength={100}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Content */}
        <div className="mb-6">
          <label htmlFor="post-content" className="mb-1.5 block text-sm font-medium">
            {t.postContent}
          </label>
          <textarea
            id="post-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={STRINGS.community.postContentPlaceholder}
            rows={10}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            건전한 커뮤니티 문화를 해치는 게시글은 숨김 및 삭제될 수 있습니다.
          </p>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={isPending || !title.trim() || !content.trim()}
          className="w-full"
        >
          {isPending ? STRINGS.common.saving : t.submit}
        </Button>
      </div>
    </div>
  );
}
