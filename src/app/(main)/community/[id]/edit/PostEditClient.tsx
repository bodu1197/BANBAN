// @client-reason: form state management, form submission
"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ImagePlus, Youtube, X } from "lucide-react";
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
  initialImageUrl: string;
  initialYoutubeUrl: string;
}

export function PostEditClient({
  postId,
  initialTitle,
  initialContent,
  initialImageUrl,
  initialYoutubeUrl,
}: Readonly<PostEditClientProps>): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [youtubeUrl, setYoutubeUrl] = useState(initialYoutubeUrl);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const form = new globalThis.FormData();
      form.append("file", file);
      const path = `community/${crypto.randomUUID()}.webp`;
      const res = await fetch(`/api/upload?bucket=portfolios&path=${encodeURIComponent(path)}`, { method: "PUT", body: form });
      const json = await res.json() as { success: boolean; path?: string };
      if (json.success && json.path) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
        setImageUrl(`${supabaseUrl}/storage/v1/object/public/portfolios/${json.path}`);
      }
    } catch { /* upload failed */ }
    setUploading(false);
  }, []);

  function handleSubmit(): void {
    if (!title.trim() || !content.trim()) return;

    startTransition(async () => {
      const result = await updatePost(
        postId,
        title.trim(),
        content.trim(),
        imageUrl || null,
        youtubeUrl.trim() || null,
      );
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

        {/* Image Upload */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium">이미지 첨부</label>
          {imageUrl ? (
            <div className="relative w-full max-w-[300px]">
              <Image src={imageUrl} alt="첨부 이미지" width={300} height={200} className="rounded-lg object-cover" />
              <button type="button" onClick={() => setImageUrl("")}
                className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white hover:bg-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="이미지 삭제">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ImagePlus className="h-5 w-5" />
              {uploading ? "업로드 중..." : "이미지 선택"}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
        </div>

        {/* YouTube URL */}
        <div className="mb-6">
          <label htmlFor="edit-youtube" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
            <Youtube className="h-4 w-4 text-red-500" />
            유튜브 영상 URL
          </label>
          <input
            id="edit-youtube"
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
