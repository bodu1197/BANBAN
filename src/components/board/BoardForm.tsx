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
  const str = (v: string | null | undefined): string => v ?? "";
  return {
    title: str(initial?.title),
    category: str(initial?.category),
    content: str(initial?.content),
    coverImageUrl: str(initial?.cover_image_url),
    coverImageAlt: str(initial?.cover_image_alt),
    published: initial?.published ?? true,
  };
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const err = (await res.json().catch(() => ({}))) as { error?: string };
  return err.error ?? fallback;
}

interface SubmitPayload {
  title: string;
  category: string;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  inline_images: { url: string; alt?: string }[];
  published: boolean;
}

function buildSubmitPayload(form: FormState, inlineImages: { url: string; alt?: string }[]): SubmitPayload {
  return {
    title: form.title.trim(),
    category: form.category.trim(),
    content: form.content,
    cover_image_url: form.coverImageUrl.trim() || null,
    cover_image_alt: form.coverImageAlt.trim() || null,
    inline_images: inlineImages,
    published: form.published,
  };
}

function submitTarget(mode: "create" | "edit", id: string | undefined): { url: string; method: string } {
  if (mode === "create") {
    return { url: "/api/board/articles", method: "POST" };
  }
  return { url: `/api/board/articles/${id ?? ""}`, method: "PATCH" };
}

function insertAtCursor(
  textarea: HTMLTextAreaElement | null,
  content: string,
  markdown: string,
): { next: string; caret: number | null } {
  if (!textarea) {
    return { next: `${content}${markdown}`, caret: null };
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const next = content.substring(0, start) + markdown + content.substring(end);
  return { next, caret: start + markdown.length };
}

async function uploadImage(file: File): Promise<string> {
  const form = new globalThis.FormData();
  form.append("file", file);
  const { secureRandomFloat } = await import("@/lib/random");
  const path = `encyclopedia/${Date.now()}_${secureRandomFloat().toString(36).slice(2, 8)}.webp`;
  const res = await fetch(
    `/api/upload?bucket=portfolios&path=${encodeURIComponent(path)}`,
    { method: "PUT", body: form },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "이미지 업로드 실패");
  }
  const { SUPABASE_URL } = await import("@/lib/supabase/config");
  return `${SUPABASE_URL}/storage/v1/object/public/portfolios/${path}`;
}

const uploadLabelClass =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted focus-within:bg-muted focus-within:ring-2 focus-within:ring-ring";

function BusyIcon({ busy }: Readonly<{ busy: boolean }>): React.ReactElement {
  if (busy) {
    return <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />;
  }
  return <ImagePlus className="h-3.5 w-3.5" />;
}

interface HeaderProps {
  readonly mode: "create" | "edit";
  readonly published: boolean;
  readonly submitting: boolean;
  readonly onDelete: () => void;
  readonly onPublishedChange: (checked: boolean) => void;
}

function SubmitButton({ submitting }: Readonly<{ submitting: boolean }>): React.ReactElement {
  return (
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
  );
}

function FormHeader({
  mode,
  published,
  submitting,
  onDelete,
  onPublishedChange,
}: HeaderProps): React.ReactElement {
  return (
    <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <h1 className="text-xl font-bold text-foreground">
        {mode === "create" ? "새 글 작성" : "글 수정"}
      </h1>
      <div className="flex items-center gap-2">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={onDelete}
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
            checked={published}
            onChange={(e) => onPublishedChange(e.target.checked)}
            className="h-4 w-4 rounded border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          게시
        </label>
        <SubmitButton submitting={submitting} />
      </div>
    </header>
  );
}

interface CoverSectionProps {
  readonly coverImageUrl: string;
  readonly coverImageAlt: string;
  readonly uploadingCover: boolean;
  readonly onChange: (k: "coverImageUrl" | "coverImageAlt", v: string) => void;
  readonly onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function CoverPreview({
  coverImageUrl,
  coverImageAlt,
}: Readonly<{ coverImageUrl: string; coverImageAlt: string }>): React.ReactElement {
  if (coverImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin preview, dynamic URL
      <img
        src={coverImageUrl}
        alt={coverImageAlt || "cover"}
        className="h-24 w-40 rounded-lg object-cover"
      />
    );
  }
  return (
    <div className="flex h-24 w-40 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
      미지정
    </div>
  );
}

function CoverImageSection({
  coverImageUrl,
  coverImageAlt,
  uploadingCover,
  onChange,
  onUpload,
}: CoverSectionProps): React.ReactElement {
  return (
    <section className="space-y-2">
      <label className={labelClass}>표지 이미지</label>
      <div className="flex items-start gap-3">
        <CoverPreview coverImageUrl={coverImageUrl} coverImageAlt={coverImageAlt} />
        <div className="flex-1 space-y-2">
          <label className={uploadLabelClass}>
            <BusyIcon busy={uploadingCover} />
            {uploadingCover ? "업로드 중..." : "표지 이미지 업로드"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onUpload}
              disabled={uploadingCover}
            />
          </label>
          <input
            className={inputClass}
            value={coverImageUrl}
            onChange={(e) => onChange("coverImageUrl", e.target.value)}
            placeholder="또는 URL 직접 입력"
          />
          <input
            className={inputClass}
            value={coverImageAlt}
            onChange={(e) => onChange("coverImageAlt", e.target.value)}
            placeholder="표지 이미지 설명 (alt 텍스트)"
          />
        </div>
      </div>
    </section>
  );
}

interface ContentSectionProps {
  readonly content: string;
  readonly uploadingInline: boolean;
  readonly contentRef: React.RefObject<HTMLTextAreaElement | null>;
  readonly onChange: (v: string) => void;
  readonly onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function ContentSection({
  content,
  uploadingInline,
  contentRef,
  onChange,
  onUpload,
}: ContentSectionProps): React.ReactElement {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={labelClass} htmlFor="board-content">
          본문 *
        </label>
        <label className={uploadLabelClass}>
          <BusyIcon busy={uploadingInline} />
          {uploadingInline ? "업로드 중..." : "본문 이미지 삽입"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
            disabled={uploadingInline}
          />
        </label>
      </div>
      <textarea
        id="board-content"
        ref={contentRef}
        className={`${inputClass} min-h-[400px] font-mono text-[13px]`}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"본문을 작성하세요.\n\n## 소제목\n\n내용을 입력합니다.\n\n이미지는 '본문 이미지 삽입' 버튼으로 업로드하면 커서 위치에 삽입됩니다."}
        required
        aria-required="true"
        aria-label="본문 에디터"
      />
      <p className="text-[11px] text-muted-foreground">
        Markdown 지원. 본문 이미지 업로드 시 커서 위치에 자동 삽입.
      </p>
    </section>
  );
}

interface MetaFieldsProps {
  readonly title: string;
  readonly category: string;
  readonly onChange: (k: "title" | "category", v: string) => void;
}

function MetaFields({ title, category, onChange }: MetaFieldsProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="board-title">
          제목 *
        </label>
        <input
          id="board-title"
          className={inputClass}
          value={title}
          onChange={(e) => onChange("title", e.target.value)}
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
          value={category}
          onChange={(e) => onChange("category", e.target.value)}
          placeholder="눈썹, 입술, 아이라인, 관리법 등"
          required
          aria-required="true"
        />
      </div>
    </div>
  );
}

type Setter<T> = (v: T | ((prev: T) => T)) => void;
type Updater = <K extends keyof FormState>(k: K, v: FormState[K]) => void;

async function runCoverUpload(
  e: React.ChangeEvent<HTMLInputElement>,
  deps: {
    update: Updater;
    setUploadingCover: Setter<boolean>;
    setError: Setter<string | null>;
  },
): Promise<void> {
  const file = e.target.files?.[0];
  if (!file) return;
  deps.setUploadingCover(true);
  deps.setError(null);
  try {
    const url = await uploadImage(file);
    deps.update("coverImageUrl", url);
  } catch (err: unknown) {
    deps.setError(errorMessage(err, "업로드 실패"));
  } finally {
    deps.setUploadingCover(false);
    e.target.value = "";
  }
}

async function runInlineUpload(
  e: React.ChangeEvent<HTMLInputElement>,
  deps: {
    form: FormState;
    contentRef: React.RefObject<HTMLTextAreaElement | null>;
    update: Updater;
    setInlineImages: Setter<{ url: string; alt?: string }[]>;
    setUploadingInline: Setter<boolean>;
    setError: Setter<string | null>;
  },
): Promise<void> {
  const file = e.target.files?.[0];
  if (!file) return;
  deps.setUploadingInline(true);
  deps.setError(null);
  try {
    const url = await uploadImage(file);
    const alt =
      globalThis.prompt("이미지 설명 (alt 텍스트)", deps.form.title || "본문 이미지") ??
      "본문 이미지";
    deps.setInlineImages((prev) => [...prev, { url, alt }]);
    const textarea = deps.contentRef.current;
    const markdown = `\n\n![${alt}](${url})\n\n`;
    const { next, caret } = insertAtCursor(textarea, deps.form.content, markdown);
    deps.update("content", next);
    if (textarea && caret !== null) {
      globalThis.setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(caret, caret);
      }, 0);
    }
  } catch (err: unknown) {
    deps.setError(errorMessage(err, "업로드 실패"));
  } finally {
    deps.setUploadingInline(false);
    e.target.value = "";
  }
}

async function runSubmit(
  e: React.FormEvent,
  deps: {
    form: FormState;
    inlineImages: { url: string; alt?: string }[];
    mode: "create" | "edit";
    initial: BoardFormInitial | undefined;
    router: ReturnType<typeof useRouter>;
    setSubmitting: Setter<boolean>;
    setError: Setter<string | null>;
  },
): Promise<void> {
  e.preventDefault();
  deps.setSubmitting(true);
  deps.setError(null);
  try {
    const payload = buildSubmitPayload(deps.form, deps.inlineImages);
    const { url, method } = submitTarget(deps.mode, deps.initial?.id);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await parseError(res, "저장 실패"));
    }
    const body = (await res.json().catch(() => ({}))) as {
      article?: { slug?: string };
    };
    const targetSlug = body.article?.slug ?? deps.initial?.slug ?? "";
    deps.router.push(`/encyclopedia/${encodeURIComponent(targetSlug)}`);
    deps.router.refresh();
  } catch (err: unknown) {
    deps.setError(errorMessage(err, "저장 실패"));
  } finally {
    deps.setSubmitting(false);
  }
}

async function runDelete(deps: {
  form: FormState;
  initial: BoardFormInitial | undefined;
  router: ReturnType<typeof useRouter>;
}): Promise<void> {
  const id = deps.initial?.id;
  if (!id) return;
  if (!globalThis.confirm(`"${deps.form.title}" 글을 삭제합니다. 되돌릴 수 없습니다.`)) return;
  const res = await fetch(`/api/board/articles/${id}`, { method: "DELETE" });
  if (res.ok) {
    deps.router.push("/encyclopedia");
    deps.router.refresh();
  } else {
    globalThis.alert(`삭제 실패: ${await parseError(res, "알 수 없음")}`);
  }
}

interface BoardFormController {
  readonly form: FormState;
  readonly submitting: boolean;
  readonly uploadingCover: boolean;
  readonly uploadingInline: boolean;
  readonly error: string | null;
  readonly contentRef: React.RefObject<HTMLTextAreaElement | null>;
  readonly update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  readonly handleCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  readonly handleInlineUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  readonly handleSubmit: (e: React.FormEvent) => Promise<void>;
  readonly handleDelete: () => Promise<void>;
}

function useBoardForm({ initial, mode }: Readonly<Props>): BoardFormController {
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

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>): Promise<void> =>
    runCoverUpload(e, { update, setUploadingCover, setError });

  const handleInlineUpload = (e: React.ChangeEvent<HTMLInputElement>): Promise<void> =>
    runInlineUpload(e, {
      form,
      contentRef,
      update,
      setInlineImages,
      setUploadingInline,
      setError,
    });

  const handleSubmit = (e: React.FormEvent): Promise<void> =>
    runSubmit(e, { form, inlineImages, mode, initial, router, setSubmitting, setError });

  const handleDelete = (): Promise<void> => runDelete({ form, initial, router });

  return {
    form,
    submitting,
    uploadingCover,
    uploadingInline,
    error,
    contentRef,
    update,
    handleCoverUpload,
    handleInlineUpload,
    handleSubmit,
    handleDelete,
  };
}

export function BoardForm({ initial, mode }: Readonly<Props>): React.ReactElement {
  const {
    form,
    submitting,
    uploadingCover,
    uploadingInline,
    error,
    contentRef,
    update,
    handleCoverUpload,
    handleInlineUpload,
    handleSubmit,
    handleDelete,
  } = useBoardForm({ initial, mode });

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto w-full max-w-[800px] space-y-6 px-4 py-6">
      <FormHeader
        mode={mode}
        published={form.published}
        submitting={submitting}
        onDelete={() => void handleDelete()}
        onPublishedChange={(checked) => update("published", checked)}
      />

      {error ? (
        <div role="alert" aria-live="polite" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <MetaFields
        title={form.title}
        category={form.category}
        onChange={(k, v) => update(k, v)}
      />

      <CoverImageSection
        coverImageUrl={form.coverImageUrl}
        coverImageAlt={form.coverImageAlt}
        uploadingCover={uploadingCover}
        onChange={(k, v) => update(k, v)}
        onUpload={(e) => void handleCoverUpload(e)}
      />

      <ContentSection
        content={form.content}
        uploadingInline={uploadingInline}
        contentRef={contentRef}
        onChange={(v) => update("content", v)}
        onUpload={(e) => void handleInlineUpload(e)}
      />
    </form>
  );
}
