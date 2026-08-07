// @client-reason: form state management, form submission
"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ImagePlus, Youtube, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { STRINGS } from "@/lib/strings";
import { Button } from "@/components/ui/button";
import { GuestPasswordField } from "@/components/community/GuestFields";
import { GUEST_PASSWORD_MIN } from "@/lib/guest-limits";
import { POST_TITLE_MAX, POST_CONTENT_MAX } from "@/lib/post-limits";
import { updatePost } from "@/lib/actions/community";

const t = STRINGS.community;

interface PostEditClientProps {
  postId: string;
  initialTitle: string;
  initialContent: string;
  initialImageUrl: string;
  initialYoutubeUrl: string;
  /** 비회원 글 — 저장하려면 작성 시 정한 비밀번호가 필요하다. */
  requireGuestPassword: boolean;
}

function PostImageUpload({ imageUrl, uploading, onClear, onPickFile, fileRef, onFileChange }: Readonly<{
  imageUrl: string; uploading: boolean; onClear: () => void;
  onPickFile: () => void; fileRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (file: File) => void;
}>): React.ReactElement {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-sm font-medium">이미지 첨부</label>
      {imageUrl ? (
        <div className="relative w-full max-w-[300px]">
          <Image src={imageUrl} alt="첨부 이미지" width={300} height={200} className="rounded-lg object-cover" />
          <button type="button" onClick={onClear}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white hover:bg-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="이미지 삭제">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={onPickFile} disabled={uploading}
          className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ImagePlus className="h-5 w-5" aria-hidden="true" />
          <span aria-live="polite">{uploading ? "업로드 중..." : "이미지 선택"}</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange(f); }} />
    </div>
  );
}

function YouTubeInput({ id, value, onChange }: Readonly<{
  id: string; value: string; onChange: (v: string) => void;
}>): React.ReactElement {
  return (
    <div className="mb-6">
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
        <Youtube className="h-4 w-4 text-red-500" />
        유튜브 영상 URL
      </label>
      <input id={id} type="url" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=..."
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </div>
  );
}

async function uploadCommunityImage(file: File): Promise<string> {
  const form = new globalThis.FormData();
  form.append("file", file);
  const path = `community/${crypto.randomUUID()}.webp`;
  const res = await fetch(`/api/upload?bucket=portfolios&path=${encodeURIComponent(path)}`, { method: "PUT", body: form });
  const json = await res.json() as { success: boolean; path?: string; error?: string };
  if (json.success && json.path) {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
    return `${supabaseUrl}/storage/v1/object/public/portfolios/${json.path}`;
  }
  // 서버 사유(예: 업로드 횟수 초과)를 그대로 보여준다.
  throw new Error(json.error ?? STRINGS.common.imageUploadFailed);
}

function PostEditForm({ title, content, imageUrl, youtubeUrl, uploading, isPending, canSubmit, guestPasswordField, fileRef, onTitleChange, onContentChange, onImageClear, onPickFile, onImageUpload, onYoutubeChange, onSubmit }: Readonly<{
  title: string; content: string; imageUrl: string; youtubeUrl: string;
  uploading: boolean; isPending: boolean; canSubmit: boolean;
  guestPasswordField: React.ReactNode;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onTitleChange: (v: string) => void; onContentChange: (v: string) => void;
  onImageClear: () => void; onPickFile: () => void;
  onImageUpload: (file: File) => void; onYoutubeChange: (v: string) => void;
  onSubmit: () => void;
}>): React.ReactElement {
  return (
    <div className="px-4 py-4">
      {guestPasswordField}
      <div className="mb-4">
        <label htmlFor="edit-title" className="mb-1.5 block text-sm font-medium">{t.postTitle}</label>
        <input id="edit-title" type="text" value={title} onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t.postTitlePlaceholder} maxLength={POST_TITLE_MAX}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <div className="mb-6">
        <label htmlFor="edit-content" className="mb-1.5 block text-sm font-medium">{t.postContent}</label>
        <textarea id="edit-content" value={content} onChange={(e) => onContentChange(e.target.value)}
          placeholder={t.postContentPlaceholder} rows={10} maxLength={POST_CONTENT_MAX}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <PostImageUpload imageUrl={imageUrl} uploading={uploading} onClear={onImageClear}
        onPickFile={onPickFile} fileRef={fileRef} onFileChange={onImageUpload} />
      <YouTubeInput id="edit-youtube" value={youtubeUrl} onChange={onYoutubeChange} />
      <Button onClick={onSubmit} disabled={isPending || !canSubmit} className="w-full">
        {isPending ? STRINGS.common.saving : t.edit}
      </Button>
    </div>
  );
}

export function PostEditClient({
  postId,
  initialTitle,
  initialContent,
  initialImageUrl,
  initialYoutubeUrl,
  requireGuestPassword,
}: Readonly<PostEditClientProps>): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [youtubeUrl, setYoutubeUrl] = useState(initialYoutubeUrl);
  const [guestPassword, setGuestPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    Boolean(title.trim())
    && Boolean(content.trim())
    && (!requireGuestPassword || guestPassword.length >= GUEST_PASSWORD_MIN);

  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      setImageUrl(await uploadCommunityImage(file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : STRINGS.common.imageUploadFailed);
    }
    setUploading(false);
  }, []);

  function handleSubmit(): void {
    if (!canSubmit) return;
    startTransition(async () => {
      const result = await updatePost(
        postId, title.trim(), content.trim(),
        imageUrl || null, youtubeUrl.trim() || null,
        requireGuestPassword ? guestPassword : undefined,
      );
      if (result.success) router.push(`/community/${postId}`);
      else if (result.error) toast.error(result.error);
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1024px]">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Link href={`/community/${postId}`} aria-label="뒤로 가기"
          className="rounded-lg p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-base font-bold">{t.edit}</h1>
      </div>
      <PostEditForm
        title={title} content={content} imageUrl={imageUrl} youtubeUrl={youtubeUrl}
        uploading={uploading} isPending={isPending} canSubmit={canSubmit} fileRef={fileRef}
        guestPasswordField={requireGuestPassword ? (
          <div className="mb-4">
            <p className="mb-2 text-xs text-muted-foreground">{t.guestOnlyNotice}</p>
            <GuestPasswordField
              id="edit-guest-password"
              value={guestPassword}
              placeholder={t.guestPasswordPrompt}
              mode="verify"
              onChange={setGuestPassword}
            />
          </div>
        ) : null}
        onTitleChange={setTitle} onContentChange={setContent}
        onImageClear={() => setImageUrl("")} onPickFile={() => fileRef.current?.click()}
        onImageUpload={handleImageUpload} onYoutubeChange={setYoutubeUrl} onSubmit={handleSubmit}
      />
    </div>
  );
}
