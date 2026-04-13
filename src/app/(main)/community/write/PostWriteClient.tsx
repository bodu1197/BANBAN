// @client-reason: form state management, form submission
"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ImagePlus, Youtube, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { STRINGS } from "@/lib/strings";
import { Button } from "@/components/ui/button";
import { createPost } from "@/lib/actions/community";

const t = STRINGS.community;

const BOARD_OPTIONS = [
  { key: "PROCEDURE_REVIEW", label: t.procedureReview },
  { key: "COURSE_REVIEW", label: t.courseReview },
  { key: "SHOP_RECRUIT", label: t.shopRecruit },
  { key: "MODEL_RECRUIT", label: t.modelRecruit },
] as const;

export function PostWriteClient(): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [board, setBoard] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
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
    if (!board || !title.trim() || !content.trim()) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("content", content.trim());
      formData.set("type_board", board);
      if (imageUrl) formData.set("image_url", imageUrl);
      if (youtubeUrl.trim()) formData.set("youtube_url", youtubeUrl.trim());

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
          <label htmlFor="youtube-url" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
            <Youtube className="h-4 w-4 text-red-500" />
            유튜브 영상 URL
          </label>
          <input
            id="youtube-url"
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
          disabled={isPending || !board || !title.trim() || !content.trim()}
          className="w-full"
        >
          {isPending ? STRINGS.common.saving : t.submit}
        </Button>
      </div>
    </div>
  );
}
