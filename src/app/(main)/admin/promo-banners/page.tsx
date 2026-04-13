// @client-reason: Admin promo banner CRUD with image upload, reorder
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Save, X, Upload,
  Link as LinkIcon, ArrowUp, ArrowDown, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminLoadingSpinner, AdminPageHeader } from "@/components/admin/admin-shared";
import { getStorageUrl } from "@/lib/supabase/storage-utils";

/* ─── Constants ──────────────────────────────────────────── */

const REQUIRED_WIDTH = 360;
const REQUIRED_HEIGHT = 240;
const SIZE_LABEL = `${REQUIRED_WIDTH}x${REQUIRED_HEIGHT}px`;

interface PromoBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image_path: string;
  link_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

interface FormData {
  title: string;
  subtitle: string;
  image_path: string;
  link_url: string;
  is_active: boolean;
}

const EMPTY_FORM: FormData = { title: "", subtitle: "", image_path: "", link_url: "", is_active: true };
const API = "/api/admin/promo-banners";
const HEADERS = { "Content-Type": "application/json" };

async function api(method: string, body?: unknown): Promise<void> {
  await fetch(API, { method, headers: HEADERS, body: body ? JSON.stringify(body) : undefined });
}

/* ─── Image Upload with Size Validation ──────────────────── */

function validateImageSize(file: File): Promise<{ valid: boolean; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new globalThis.Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({
        valid: img.width >= REQUIRED_WIDTH && img.height >= REQUIRED_HEIGHT,
        width: img.width,
        height: img.height,
      });
    };
    img.onerror = () => resolve({ valid: false, width: 0, height: 0 });
    img.src = URL.createObjectURL(file);
  });
}

function BannerImageUpload({ currentPath, onUpload }: Readonly<{
  currentPath: string; onUpload: (path: string) => void;
}>): React.ReactElement {
  const [uploading, setUploading] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageUrl = currentPath ? getStorageUrl(currentPath) : null;

  const handleFile = useCallback(async (file: File) => {
    setSizeError(null);

    const { valid, width, height } = await validateImageSize(file);
    if (!valid) {
      setSizeError(`이미지가 너무 작습니다 (${width}x${height}px). 최소 ${SIZE_LABEL} 이상이어야 합니다.`);
      return;
    }

    setUploading(true);
    try {
      const form = new globalThis.FormData();
      form.append("file", file);
      const res = await fetch("/api/upload?bucket=portfolios&folder=promo-banners", { method: "POST", body: form });
      const json = await res.json() as { success: boolean; paths?: { original: string }; error?: string };
      if (json.success && json.paths) onUpload(json.paths.original);
    } catch { /* upload failed */ }
    setUploading(false);
  }, [onUpload]);

  const openPicker = useCallback(() => fileRef.current?.click(), []);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-zinc-400">
        배너 이미지
        <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
          권장 {SIZE_LABEL} (3:2 비율)
        </span>
      </label>

      {imageUrl ? (
        <div className="relative aspect-[3/2] w-full max-w-[360px] overflow-hidden rounded-lg border border-white/10">
          <Image src={imageUrl} alt="배너 미리보기" fill sizes="360px" className="object-cover" />
          <button type="button" aria-label="이미지 변경" onClick={openPicker}
            className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            변경
          </button>
        </div>
      ) : (
        <button type="button" onClick={openPicker} disabled={uploading}
          className="flex w-full max-w-[360px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 bg-white/5 py-10 text-zinc-400 transition-colors hover:border-amber-500/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Upload className="h-8 w-8" />
          <span className="text-sm">{uploading ? "업로드 중..." : "이미지를 선택하세요"}</span>
          <span className="text-[10px] text-zinc-500">최소 {SIZE_LABEL} · 3:2 비율 권장</span>
        </button>
      )}

      {sizeError ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {sizeError}
        </div>
      ) : null}

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

/* ─── Form Input ─────────────────────────────────────────── */

function FormInput({ label, value, onChange, placeholder, icon }: Readonly<{
  label: string; value: string; onChange: (v: string) => void; placeholder: string; icon?: React.ReactNode;
}>): React.ReactElement {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-400">{icon}{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none" />
    </div>
  );
}

/* ─── Banner Form ────────────────────────────────────────── */

function BannerForm({ initial, onSave, onCancel, saving }: Readonly<{
  initial: FormData; onSave: (data: FormData) => void; onCancel: () => void; saving: boolean;
}>): React.ReactElement {
  const [form, setForm] = useState<FormData>(initial);
  const set = useCallback(<K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <BannerImageUpload currentPath={form.image_path} onUpload={(p) => set("image_path", p)} />
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput label="제목" value={form.title} onChange={(v) => set("title", v)} placeholder="예: 봄맞이 눈썹 이벤트" />
        <FormInput label="부제목" value={form.subtitle} onChange={(v) => set("subtitle", v)} placeholder="예: 최대 30% 할인" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput label="링크 URL" value={form.link_url} onChange={(v) => set("link_url", v)}
          placeholder="/exhibition 또는 https://..." icon={<LinkIcon className="mr-1 inline h-3 w-3" />} />
        <div className="flex items-end gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-amber-500" />
            활성화
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" /> 취소
        </button>
        <button type="button" onClick={() => onSave(form)} disabled={saving || !form.title || !form.image_path}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40">
          <Save className="h-4 w-4" /> 저장
        </button>
      </div>
    </div>
  );
}

/* ─── Banner Row ─────────────────────────────────────────── */

function BannerRow({ banner, onEdit, onDelete, onToggle, onMove, isFirst, isLast }: Readonly<{
  banner: PromoBanner; onEdit: () => void; onDelete: () => void; onToggle: () => void;
  onMove: (dir: "up" | "down") => void; isFirst: boolean; isLast: boolean;
}>): React.ReactElement {
  const imageUrl = getStorageUrl(banner.image_path);
  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${banner.is_active ? "border-white/10 bg-white/[0.03]" : "border-white/5 bg-white/[0.01] opacity-60"}`}>
      <div className="flex shrink-0 flex-col gap-1">
        <button type="button" disabled={isFirst} onClick={() => onMove("up")} aria-label="위로 이동"
          className="rounded p-1 text-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-20">
          <ArrowUp className="h-4 w-4" />
        </button>
        <GripVertical className="h-4 w-4 text-zinc-600" />
        <button type="button" disabled={isLast} onClick={() => onMove("down")} aria-label="아래로 이동"
          className="rounded p-1 text-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-20">
          <ArrowDown className="h-4 w-4" />
        </button>
      </div>
      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10">
        {imageUrl
          ? <Image src={imageUrl} alt={banner.title} fill sizes="96px" className="object-cover" />
          : <div className="flex h-full items-center justify-center bg-white/5 text-xs text-zinc-500">No Image</div>}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-white">{banner.title}</h3>
        {banner.subtitle ? <p className="mt-0.5 truncate text-xs text-zinc-400">{banner.subtitle}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {banner.link_url ? <span className="truncate rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300">{banner.link_url}</span> : null}
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${banner.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"}`}>
            {banner.is_active ? "활성" : "비활성"}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" onClick={onToggle} aria-label={banner.is_active ? "비활성화" : "활성화"} aria-pressed={banner.is_active}
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {banner.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onEdit} aria-label="수정"
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={onDelete} aria-label="삭제"
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Data & Actions ─────────────────────────────────────── */

function useBanners(authLoading: boolean): { banners: PromoBanner[]; loading: boolean; reload: () => Promise<void> } {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await fetch(API);
    const json = await res.json() as { banners: PromoBanner[] };
    setBanners(json.banners ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    fetch(API).then((r) => r.json()).then((json: { banners: PromoBanner[] }) => {
      if (!cancelled) { setBanners(json.banners ?? []); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authLoading]);

  return { banners, loading, reload };
}

/* ─── Main Page ──────────────────────────────────────────── */

export default function PromoBannersPage(): React.ReactElement {
  const { isLoading: authLoading } = useAuth();
  const { banners, loading, reload } = useBanners(authLoading);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  if (authLoading || loading) return <AdminLoadingSpinner accentColor="amber" />;

  const editingBanner = editingId ? banners.find((b) => b.id === editingId) : null;

  async function handleCreate(data: FormData): Promise<void> {
    setSaving(true);
    const maxOrder = banners.reduce((max, b) => Math.max(max, b.order_index), -1);
    await api("POST", { ...data, subtitle: data.subtitle || null, link_url: data.link_url || null, order_index: maxOrder + 1 });
    setShowCreate(false);
    await reload();
    setSaving(false);
  }

  async function handleUpdate(data: FormData): Promise<void> {
    if (!editingId) return;
    setSaving(true);
    await api("PATCH", { id: editingId, ...data, subtitle: data.subtitle || null, link_url: data.link_url || null });
    setEditingId(null);
    await reload();
    setSaving(false);
  }

  async function handleDelete(id: string): Promise<void> {
    if (!globalThis.confirm("배너를 삭제하시겠습니까?")) return;
    await api("DELETE", { id });
    await reload();
  }

  async function handleToggle(b: PromoBanner): Promise<void> {
    await api("PATCH", { id: b.id, is_active: !b.is_active });
    await reload();
  }

  /* eslint-disable security/detect-object-injection -- Safe: accessing array by numeric index */
  async function handleMove(idx: number, dir: "up" | "down"): Promise<void> {
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= banners.length) return;
    const a = banners[idx];
    const b = banners[swapIdx];
    await Promise.all([
      api("PATCH", { id: a.id, order_index: b.order_index }),
      api("PATCH", { id: b.id, order_index: a.order_index }),
    ]);
    await reload();
  }
  /* eslint-enable security/detect-object-injection */

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <AdminPageHeader title="프로모 배너 관리" count={banners.length} countLabel="개" />
        <button type="button" onClick={() => { setShowCreate(true); setEditingId(null); }}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Plus className="h-4 w-4" /> 배너 추가
        </button>
      </div>

      {/* Size Guide */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
        <p className="text-xs text-amber-300">
          배너 이미지 권장 사이즈: <strong>{SIZE_LABEL}</strong> (3:2 비율) · 최소 {SIZE_LABEL} 미만은 업로드 불가
        </p>
      </div>

      {showCreate ? (
        <section>
          <h2 className="mb-3 text-sm font-bold text-zinc-300">새 배너 만들기</h2>
          <BannerForm initial={EMPTY_FORM} onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
        </section>
      ) : null}

      {editingBanner ? (
        <section>
          <h2 className="mb-3 text-sm font-bold text-zinc-300">배너 수정</h2>
          <BannerForm
            initial={{ title: editingBanner.title, subtitle: editingBanner.subtitle ?? "", image_path: editingBanner.image_path, link_url: editingBanner.link_url ?? "", is_active: editingBanner.is_active }}
            onSave={handleUpdate} onCancel={() => setEditingId(null)} saving={saving} />
        </section>
      ) : null}

      <section className="space-y-3">
        {banners.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-16 text-zinc-500">
            <p className="text-sm">등록된 프로모 배너가 없습니다</p>
            <p className="text-xs">&quot;배너 추가&quot; 버튼을 클릭하여 첫 배너를 만들어보세요</p>
          </div>
        ) : null}
        {banners.map((banner, i) => (
          <BannerRow key={banner.id} banner={banner}
            onEdit={() => { setEditingId(banner.id); setShowCreate(false); }}
            onDelete={() => handleDelete(banner.id)}
            onToggle={() => handleToggle(banner)}
            onMove={(dir) => handleMove(i, dir)}
            isFirst={i === 0} isLast={i === banners.length - 1} />
        ))}
      </section>
    </div>
  );
}
