// @client-reason: form state management, form submission
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { STRINGS } from "@/lib/strings";
import { Button } from "@/components/ui/button";
import { updatePost } from "@/lib/actions/community";

const t = STRINGS.community;

interface PostEditClientProps {
  postId: string;
  initialTitle: string;
  initialContent: string;
  initialBoard: string;
}

export function PostEditClient({
  postId,
  initialTitle,
  initialContent,
}: Readonly<PostEditClientProps>): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  function handleSubmit(): void {
    if (!title.trim() || !content.trim()) return;

    startTransition(async () => {
      const result = await updatePost(postId, title.trim(), content.trim());
      if (result.success) {
        router.push(`/community/${postId}`);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-[767px]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Link
          href={`/community/${postId}`}
          className="rounded-lg p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-base font-bold">{t.edit}</h1>
      </div>

      <div className="px-4 py-4">
        {/* Title */}
        <div className="mb-4">
          <label htmlFor="edit-title" className="mb-1.5 block text-sm font-medium">
            {t.postTitle}
          </label>
          <input
            id="edit-title"
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
          <label htmlFor="edit-content" className="mb-1.5 block text-sm font-medium">
            {t.postContent}
          </label>
          <textarea
            id="edit-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t.postContentPlaceholder}
            rows={10}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={isPending || !title.trim() || !content.trim()}
          className="w-full"
        >
          {isPending ? STRINGS.common.saving : t.edit}
        </Button>
      </div>
    </div>
  );
}
