// @client-reason: textarea + 파일 업로드 + 동적 markdown 이미지 삽입 — 모두 클라이언트 상호작용
"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, ImagePlus, Loader2 } from "lucide-react";

interface InlineImage { url: string; alt?: string }

export interface ArticleFormInitial {
  id?: string;
  slug?: string;
  title?: string;
  category?: string;
  content?: string;
  excerpt?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
  inline_images?: InlineImage[];
  keywords?: string[];
  tags?: string[];
  published?: boolean;
}

interface Props {
  initial?: ArticleFormInitial;
  mode: "create" | "edit";
}

interface FormState {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  coverImageUrl: string;
  coverImageAlt: string;
  keywords: string;
  tags: string;
  published: boolean;
}

const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-pink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500";
const labelClass = "mb-1 block text-xs font-medium text-zinc-300";

function buildInitialState(initial: ArticleFormInitial | undefined): FormState {
  return {
    slug: initial?.slug ?? "",
    title: initial?.title ?? "",
    category: initial?.category ?? "",
    excerpt: initial?.excerpt ?? "",
    metaTitle: initial?.meta_title ?? "",
    metaDescription: initial?.meta_description ?? "",
    content: initial?.content ?? "",
    coverImageUrl: initial?.cover_image_url ?? "",
    coverImageAlt: initial?.cover_image_alt ?? "",
    keywords: (initial?.keywords ?? []).join(", "),
    tags: (initial?.tags ?? []).join(", "),
    published: initial?.published ?? true,
  };
}

function parseCsv(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

async function uploadImage(file: File): Promise<string> {
  const form = new globalThis.FormData();
  form.append("file", file);
  const path = `encyclopedia/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
  const res = await fetch(`/api/upload?bucket=portfolios&path=${encodeURIComponent(path)}`, { method: "PUT", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "이미지 업로드 실패");
  }
  const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  return `${SUPABASE_URL}/storage/v1/object/public/portfolios/${path}`;
}

function MetaSection({ form, onChange }: Readonly<{ form: FormState; onChange: <K extends keyof FormState>(k: K, v: FormState[K]) => void }>): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label className={labelClass}>slug (URL) *</label>
        <input className={inputClass} value={form.slug} onChange={(e) => onChange("slug", e.target.value)} placeholder="endurance-tips" required aria-required="true" />
        <p className="mt-1 text-[11px] text-zinc-500">영문/숫자/한글/-/_ . URL 에 그대로 노출됩니다.</p>
      </div>
      <div>
        <label className={labelClass}>제목 *</label>
        <input className={inputClass} value={form.title} onChange={(e) => onChange("title", e.target.value)} required aria-required="true" />
      </div>
      <div>
        <label className={labelClass}>카테고리 *</label>
        <input className={inputClass} value={form.category} onChange={(e) => onChange("category", e.target.value)} placeholder="눈썹" required aria-required="true" />
      </div>
      <div>
        <label className={labelClass}>읽기 시간 (자동 계산)</label>
        <input className={inputClass} disabled value="저장 시 본문 길이로 자동 계산" />
      </div>
      <div className="md:col-span-2">
        <label className={labelClass} htmlFor="article-excerpt">요약 (excerpt) — SEO 미리보기</label>
        <textarea id="article-excerpt" className={`${inputClass} min-h-[60px]`} value={form.excerpt} onChange={(e) => onChange("excerpt", e.target.value)} rows={2} aria-label="요약 (excerpt) 입력" />
      </div>
      <div>
        <label className={labelClass}>meta title (선택)</label>
        <input className={inputClass} value={form.metaTitle} onChange={(e) => onChange("metaTitle", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>meta description (선택)</label>
        <input className={inputClass} value={form.metaDescription} onChange={(e) => onChange("metaDescription", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>키워드 (쉼표 구분)</label>
        <input className={inputClass} value={form.keywords} onChange={(e) => onChange("keywords", e.target.value)} placeholder="눈썹, 자연눈썹, 반영구" />
      </div>
      <div>
        <label className={labelClass}>태그 (쉼표 구분)</label>
        <input className={inputClass} value={form.tags} onChange={(e) => onChange("tags", e.target.value)} placeholder="가이드, 초보" />
      </div>
    </div>
  );
}

export function EncyclopediaArticleForm({ initial, mode }: Readonly<Props>): React.ReactElement {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => buildInitialState(initial));
  const [inlineImages, setInlineImages] = useState<InlineImage[]>(initial?.inline_images ?? []);
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
    setUploadingCover(true); setError(null);
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
    setUploadingInline(true); setError(null);
    try {
      const url = await uploadImage(file);
      const alt = globalThis.prompt("이미지 설명 (alt 텍스트)", form.title || "본문 이미지") ?? "본문 이미지";
      const newImg = { url, alt };
      setInlineImages((prev) => [...prev, newImg]);
      // 커서 위치에 markdown 삽입
      const textarea = contentRef.current;
      const markdown = `\n\n![${alt}](${url})\n\n`;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const next = form.content.substring(0, start) + markdown + form.content.substring(end);
        update("content", next);
        // 커서 이동
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
    setSubmitting(true); setError(null);
    try {
      const payload = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        category: form.category.trim(),
        content: form.content,
        excerpt: form.excerpt.trim() || null,
        meta_title: form.metaTitle.trim() || null,
        meta_description: form.metaDescription.trim() || null,
        cover_image_url: form.coverImageUrl.trim() || null,
        cover_image_alt: form.coverImageAlt.trim() || null,
        inline_images: inlineImages,
        keywords: parseCsv(form.keywords),
        tags: parseCsv(form.tags),
        published: form.published,
      };
      const url = mode === "create" ? "/api/admin/encyclopedia/articles" : `/api/admin/encyclopedia/articles/${initial?.id ?? ""}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "저장 실패");
      }
      router.push("/admin/encyclopedia/articles");
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
    const res = await fetch(`/api/admin/encyclopedia/articles/${initial.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/encyclopedia/articles");
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({})) as { error?: string };
      globalThis.alert(`삭제 실패: ${err.error ?? "알 수 없음"}`);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 p-6 pb-32">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-bold text-white">{mode === "create" ? "백과사전 글 작성" : "백과사전 글 수정"}</h1>
        <div className="flex items-center gap-2">
          {mode === "edit" ? (
            <button type="button" onClick={() => void handleDelete()} className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </button>
          ) : null}
          <label htmlFor="article-published" className="flex items-center gap-1.5 text-xs text-zinc-300">
            <input
              id="article-published"
              type="checkbox"
              checked={form.published}
              onChange={(e) => update("published", e.target.checked)}
              className="h-4 w-4 rounded border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            />
            게시
          </label>
          <button type="submit" disabled={submitting} className="flex items-center gap-1.5 rounded-lg bg-pink-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-pink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 disabled:opacity-50">
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {submitting ? "저장중..." : "저장"}
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>
      ) : null}

      <MetaSection form={form} onChange={update} />

      <section className="space-y-2">
        <label className={labelClass}>표지 이미지</label>
        <div className="flex items-start gap-3">
          {form.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview, dynamic URL outside next/image whitelist
            <img src={form.coverImageUrl} alt={form.coverImageAlt || "cover"} className="h-24 w-40 rounded-lg object-cover" />
          ) : (
            <div className="flex h-24 w-40 items-center justify-center rounded-lg border border-dashed border-white/20 text-xs text-zinc-500">미지정</div>
          )}
          <div className="flex-1 space-y-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/20 focus-within:bg-white/20 focus-within:ring-2 focus-within:ring-pink-500">
              {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              {uploadingCover ? "업로드 중..." : "표지 이미지 업로드"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => void handleCoverUpload(e)} disabled={uploadingCover} />
            </label>
            <input className={inputClass} value={form.coverImageUrl} onChange={(e) => update("coverImageUrl", e.target.value)} placeholder="또는 URL 직접 입력" />
            <input className={inputClass} value={form.coverImageAlt} onChange={(e) => update("coverImageAlt", e.target.value)} placeholder="표지 이미지 alt 텍스트" />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={labelClass}>본문 (Markdown)</label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/20 focus-within:bg-white/20 focus-within:ring-2 focus-within:ring-pink-500">
            {uploadingInline ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {uploadingInline ? "업로드 중..." : "본문 이미지 삽입"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => void handleInlineUpload(e)} disabled={uploadingInline} />
          </label>
        </div>
        <textarea
          ref={contentRef}
          className={`${inputClass} min-h-[500px] font-mono text-[13px]`}
          value={form.content}
          onChange={(e) => update("content", e.target.value)}
          placeholder="# 제목&#10;&#10;본문을 markdown 으로 작성하세요.&#10;&#10;이미지는 우측 위 '본문 이미지 삽입' 버튼으로 업로드하면 커서 위치에 자동 삽입됩니다."
          required
          aria-required="true"
          aria-label="본문 markdown 에디터"
        />
        <p className="text-[11px] text-zinc-500">Markdown 형식. 본문 이미지 업로드 시 커서 위치에 `![alt](url)` 자동 삽입.</p>
      </section>
    </form>
  );
}
