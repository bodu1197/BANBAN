// @client-reason: textarea + 파일 업로드 + 동적 markdown 이미지 삽입
"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, ImagePlus, Loader2 } from "lucide-react";

export interface BoardFormInitial {
  id?: string;
  slug?: string;
  title?: string;
  category?: string;
  content?: string;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
  inline_images?: { url: string; alt?: string }[];
  published?: boolean;
}

interface Props {
  readonly initial?: BoardFormInitial;
  readonly mode: "create" | "edit";
}

interface FormState {
  title: string;
  category: string;
  content: string;
  coverImageUrl: string;
  coverImageAlt: string;
  published: boolean;
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";

function buildInitialState(initial: BoardFormInitial | undefined): FormState {
  return {
    title: initial?.title ?? "",
    category: initial?.category ?? "",
    content: initial?.content ?? "",
    coverImageUrl: initial?.cover_image_url ?? "",
    coverImageAlt: initial?.cover_image_alt ?? "",
    published: initial?.published ?? true,
  };
}

async function uploadImage(file: File): Promise<string> {
  const form = new globalThis.FormData();
  form.append("file", file);
  const path = `encyclopedia/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
  const res = await fetch(
    `/api/upload?bucket=portfolios&path=${encodeURIComponent(path)}`,
    { method: "PUT", body: form },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "이미지 업로드 실패");
  }
  const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  return `${SUPABASE_URL}/storage/v1/object/public/portfolios/${path}`;
}

export function BoardForm({ initial, mode }: Readonly<Props>): React.ReactElement {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => buildInitialState(initial));
  const [inlineImages, setInlineImages] = useState<{ url: string; alt?: string }[]>(
    initial?.inline_images ?? [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingInline, setUploadingInline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const update = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]): void => {
    setForm((prev) => ({ ...prev, [k]: v }));
  }, []);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      update("coverImageUrl", url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const handleInlineUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingInline(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      const alt =
        globalThis.prompt("이미지 설명 (alt 텍스트)", form.title || "본문 이미지") ??
        "본문 이미지";
      setInlineImages((prev) => [...prev, { url, alt }]);
      const textarea = contentRef.current;
      const markdown = `\n\n![${alt}](${url})\n\n`;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const next = form.content.substring(0, start) + markdown + form.content.substring(end);
        update("content", next);
        globalThis.setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + markdown.length, start + markdown.length);
        }, 0);
      } else {
        update("content", `${form.content}${markdown}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploadingInline(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim(),
        content: form.content,
        cover_image_url: form.coverImageUrl.trim() || null,
        cover_image_alt: form.coverImageAlt.trim() || null,
        inline_images: inlineImages,
        published: form.published,
      };
      const url =
        mode === "create"
          ? "/api/board/articles"
          : `/api/board/articles/${initial?.id ?? ""}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "저장 실패");
      }
      const body = (await res.json().catch(() => ({}))) as {
        article?: { slug?: string };
      };
      const targetSlug = body.article?.slug ?? initial?.slug ?? "";
      router.push(`/encyclopedia/${encodeURIComponent(targetSlug)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!initial?.id) return;
    if (!globalThis.confirm(`"${form.title}" 글을 삭제합니다. 되돌릴 수 없습니다.`)) return;
    const res = await fetch(`/api/board/articles/${initial.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/encyclopedia");
      router.refresh();
    } else {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      globalThis.alert(`삭제 실패: ${err.error ?? "알 수 없음"}`);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto w-full max-w-[800px] space-y-6 px-4 py-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-bold text-foreground">
          {mode === "create" ? "새 글 작성" : "글 수정"}
        </h1>
        <div className="flex items-center gap-2">
          {mode === "edit" ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </button>
          ) : null}
          <label
            htmlFor="board-published"
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <input
              id="board-published"
              type="checkbox"
              checked={form.published}
              onChange={(e) => update("published", e.target.checked)}
              className="h-4 w-4 rounded border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            게시
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-1.5 text-xs font-semibold text-brand-primary-foreground transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {submitting ? "저장중..." : "저장"}
          </button>
        </div>
      </header>

      {error ? (
        <div role="alert" aria-live="polite" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="board-title">
            제목 *
          </label>
          <input
            id="board-title"
            className={inputClass}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="글 제목을 입력하세요"
            required
            aria-required="true"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="board-category">
            카테고리 *
          </label>
          <input
            id="board-category"
            className={inputClass}
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            placeholder="눈썹, 입술, 아이라인, 관리법 등"
            required
            aria-required="true"
          />
        </div>
      </div>

      <section className="space-y-2">
        <label className={labelClass}>표지 이미지</label>
        <div className="flex items-start gap-3">
          {form.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview, dynamic URL
            <img
              src={form.coverImageUrl}
              alt={form.coverImageAlt || "cover"}
              className="h-24 w-40 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-24 w-40 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              미지정
            </div>
          )}
          <div className="flex-1 space-y-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted focus-within:bg-muted focus-within:ring-2 focus-within:ring-ring">
              {uploadingCover ? (
                <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              {uploadingCover ? "업로드 중..." : "표지 이미지 업로드"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleCoverUpload(e)}
                disabled={uploadingCover}
              />
            </label>
            <input
              className={inputClass}
              value={form.coverImageUrl}
              onChange={(e) => update("coverImageUrl", e.target.value)}
              placeholder="또는 URL 직접 입력"
            />
            <input
              className={inputClass}
              value={form.coverImageAlt}
              onChange={(e) => update("coverImageAlt", e.target.value)}
              placeholder="표지 이미지 설명 (alt 텍스트)"
            />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={labelClass} htmlFor="board-content">
            본문 *
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted focus-within:bg-muted focus-within:ring-2 focus-within:ring-ring">
            {uploadingInline ? (
              <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            {uploadingInline ? "업로드 중..." : "본문 이미지 삽입"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleInlineUpload(e)}
              disabled={uploadingInline}
            />
          </label>
        </div>
        <textarea
          id="board-content"
          ref={contentRef}
          className={`${inputClass} min-h-[400px] font-mono text-[13px]`}
          value={form.content}
          onChange={(e) => update("content", e.target.value)}
          placeholder={"본문을 작성하세요.\n\n## 소제목\n\n내용을 입력합니다.\n\n이미지는 '본문 이미지 삽입' 버튼으로 업로드하면 커서 위치에 삽입됩니다."}
          required
          aria-required="true"
          aria-label="본문 에디터"
        />
        <p className="text-[11px] text-muted-foreground">
          Markdown 지원. 본문 이미지 업로드 시 커서 위치에 자동 삽입.
        </p>
      </section>
    </form>
  );
}
