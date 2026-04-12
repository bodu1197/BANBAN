// @client-reason: Admin banner management with image upload, reorder, and CRUD operations
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
    Plus,
    Pencil,
    Trash2,
    GripVertical,
    Eye,
    EyeOff,
    Save,
    X,
    Upload,
    Link as LinkIcon,
    ArrowUp,
    ArrowDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminLoadingSpinner, AdminPageHeader } from "@/components/admin/admin-shared";
import { getStorageUrl } from "@/lib/supabase/storage-utils";

// ─── Types ───────────────────────────────────────────────

interface BannerItem {
    id: string;
    title: string;
    subtitle: string | null;
    image_path: string;
    link_url: string | null;
    order_index: number;
    is_active: boolean;
    start_at: string | null;
    end_at: string | null;
    created_at: string;
}

interface BannerFormData {
    title: string;
    subtitle: string;
    image_path: string;
    link_url: string;
    is_active: boolean;
    start_at: string;
    end_at: string;
}

const EMPTY_FORM: BannerFormData = { title: "", subtitle: "", image_path: "", link_url: "", is_active: true, start_at: "", end_at: "" };

const API_PATH = "/api/admin/hero-banners";
const JSON_HEADERS = { "Content-Type": "application/json" };

// ─── API helpers ─────────────────────────────────────────

async function apiFetch(method: string, body?: unknown): Promise<void> {
    await fetch(API_PATH, { method, headers: JSON_HEADERS, body: body ? JSON.stringify(body) : undefined });
}

function bannerToForm(b: BannerItem): BannerFormData {
    return { title: b.title, subtitle: b.subtitle ?? "", image_path: b.image_path, link_url: b.link_url ?? "", is_active: b.is_active, start_at: b.start_at ?? "", end_at: b.end_at ?? "" };
}

function formToPayload(data: BannerFormData): Record<string, unknown> {
    return { ...data, link_url: data.link_url || null, start_at: data.start_at || null, end_at: data.end_at || null };
}

// ─── Image Upload ────────────────────────────────────────

function UploadPlaceholder({ uploading, onClick }: Readonly<{
    uploading: boolean; onClick: () => void;
}>): React.ReactElement {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={uploading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 bg-white/5 py-10 text-zinc-400 transition-colors hover:border-amber-500/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <Upload className="h-8 w-8" />
            <span className="text-sm">{uploading ? "업로드 중..." : "이미지를 선택하세요"}</span>
        </button>
    );
}

function ImagePreview({ url, onChangeClick }: Readonly<{
    url: string; onChangeClick: () => void;
}>): React.ReactElement {
    return (
        <div className="relative aspect-[3/1] w-full overflow-hidden rounded-lg border border-white/10">
            <Image src={url} alt="배너 미리보기" fill sizes="600px" className="object-cover" />
            <button
                type="button"
                aria-label="이미지 변경"
                onClick={onChangeClick}
                className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                변경
            </button>
        </div>
    );
}

function BannerImageUpload({ currentPath, onUpload }: Readonly<{
    currentPath: string; onUpload: (path: string) => void;
}>): React.ReactElement {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const imageUrl = currentPath ? getStorageUrl(currentPath) : null;

    const handleFile = useCallback(async (file: File) => {
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch("/api/upload?bucket=portfolios&folder=banners", { method: "POST", body: form });
            const json = await res.json() as { success: boolean; paths?: { original: string }; error?: string };
            if (json.success && json.paths) onUpload(json.paths.original);
        } catch { /* upload failed */ }
        setUploading(false);
    }, [onUpload]);

    const openPicker = useCallback(() => fileRef.current?.click(), []);

    return (
        <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">배너 이미지</label>
            {imageUrl
                ? <ImagePreview url={imageUrl} onChangeClick={openPicker} />
                : <UploadPlaceholder uploading={uploading} onClick={openPicker} />}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
    );
}

// ─── Text Input ──────────────────────────────────────────

function FormInput({ label, value, onChange, placeholder, icon }: Readonly<{
    label: string; value: string; onChange: (v: string) => void; placeholder: string; icon?: React.ReactNode;
}>): React.ReactElement {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">{icon}{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
            />
        </div>
    );
}

function DateInput({ label, value, onChange }: Readonly<{
    label: string; value: string; onChange: (v: string) => void;
}>): React.ReactElement {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">{label}</label>
            <input
                type="datetime-local"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
            />
        </div>
    );
}

// ─── Banner Form (Create / Edit) ─────────────────────────

function BannerFormActions({ onCancel, onSave, disabled }: Readonly<{
    onCancel: () => void; onSave: () => void; disabled: boolean;
}>): React.ReactElement {
    return (
        <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X className="h-4 w-4" /> 취소
            </button>
            <button type="button" onClick={onSave} disabled={disabled} className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40">
                <Save className="h-4 w-4" /> 저장
            </button>
        </div>
    );
}

function BannerForm({ initial, onSave, onCancel, saving }: Readonly<{
    initial: BannerFormData; onSave: (data: BannerFormData) => void; onCancel: () => void; saving: boolean;
}>): React.ReactElement {
    const [form, setForm] = useState<BannerFormData>(initial);
    const set = useCallback(<K extends keyof BannerFormData>(key: K, val: BannerFormData[K]) => {
        setForm((prev) => ({ ...prev, [key]: val }));
    }, []);

    return (
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <BannerImageUpload currentPath={form.image_path} onUpload={(p) => set("image_path", p)} />
            <div className="grid gap-4 md:grid-cols-2">
                <FormInput label="제목 (선전 문구)" value={form.title} onChange={(v) => set("title", v)} placeholder="예: 특별 기획전 모아보기" />
                <FormInput label="부제목 (설명)" value={form.subtitle} onChange={(v) => set("subtitle", v)} placeholder="예: 할인 이벤트부터 인기 아티스트 콜라보까지" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FormInput label="링크 URL" value={form.link_url} onChange={(v) => set("link_url", v)} placeholder="/exhibition 또는 https://..." icon={<LinkIcon className="mr-1 inline h-3 w-3" />} />
                <div className="flex items-end gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                        <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/5 accent-amber-500" />
                        활성화
                    </label>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <DateInput label="시작일 (선택)" value={form.start_at} onChange={(v) => set("start_at", v)} />
                <DateInput label="종료일 (선택)" value={form.end_at} onChange={(v) => set("end_at", v)} />
            </div>
            <BannerFormActions onCancel={onCancel} onSave={() => onSave(form)} disabled={saving || !form.title || !form.image_path} />
        </div>
    );
}

// ─── Banner Row ──────────────────────────────────────────

function BannerInfo({ banner }: Readonly<{ banner: BannerItem }>): React.ReactElement {
    return (
        <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-white">{banner.title}</h3>
            {banner.subtitle ? <p className="mt-0.5 truncate text-xs text-zinc-400">{banner.subtitle}</p> : null}
            <div className="mt-1 flex flex-wrap items-center gap-2">
                {banner.link_url ? <span className="truncate rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300">{banner.link_url}</span> : null}
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${banner.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"}`}>
                    {banner.is_active ? "활성" : "비활성"}
                </span>
                <span className="text-[10px] text-zinc-500">순서: {banner.order_index}</span>
            </div>
        </div>
    );
}

function OrderButtons({ onMove, isFirst, isLast }: Readonly<{
    onMove: (dir: "up" | "down") => void; isFirst: boolean; isLast: boolean;
}>): React.ReactElement {
    const cls = "rounded p-1 text-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-20";
    return (
        <div className="flex shrink-0 flex-col gap-1">
            <button type="button" disabled={isFirst} onClick={() => onMove("up")} aria-label="위로 이동" className={cls}><ArrowUp className="h-4 w-4" /></button>
            <GripVertical className="h-4 w-4 text-zinc-600" />
            <button type="button" disabled={isLast} onClick={() => onMove("down")} aria-label="아래로 이동" className={cls}><ArrowDown className="h-4 w-4" /></button>
        </div>
    );
}

function RowActions({ banner, onEdit, onDelete, onToggle }: Readonly<{
    banner: BannerItem; onEdit: () => void; onDelete: () => void; onToggle: () => void;
}>): React.ReactElement {
    const cls = "rounded-lg p-2 text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
    return (
        <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={onToggle} aria-label={banner.is_active ? "비활성화" : "활성화"} aria-pressed={banner.is_active} className={`${cls} hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white`}>
                {banner.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button type="button" onClick={onEdit} aria-label="수정" className={`${cls} hover:bg-white/10 hover:text-amber-400 focus-visible:bg-white/10 focus-visible:text-amber-400`}>
                <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={onDelete} aria-label="삭제" className={`${cls} hover:bg-white/10 hover:text-red-400 focus-visible:bg-white/10 focus-visible:text-red-400`}>
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}

function BannerRow({ banner, onEdit, onDelete, onToggle, onMove, isFirst, isLast }: Readonly<{
    banner: BannerItem; onEdit: () => void; onDelete: () => void; onToggle: () => void;
    onMove: (dir: "up" | "down") => void; isFirst: boolean; isLast: boolean;
}>): React.ReactElement {
    const imageUrl = getStorageUrl(banner.image_path);
    return (
        <div className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${banner.is_active ? "border-white/10 bg-white/[0.03]" : "border-white/5 bg-white/[0.01] opacity-60"}`}>
            <OrderButtons onMove={onMove} isFirst={isFirst} isLast={isLast} />
            <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 md:h-20 md:w-36">
                {imageUrl
                    ? <Image src={imageUrl} alt={banner.title} fill sizes="144px" className="object-cover" />
                    : <div className="flex h-full items-center justify-center bg-white/5 text-xs text-zinc-500">No Image</div>}
            </div>
            <BannerInfo banner={banner} />
            <RowActions banner={banner} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />
        </div>
    );
}

// ─── Empty State ─────────────────────────────────────────

function EmptyState(): React.ReactElement {
    return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-16 text-zinc-500">
            <p className="text-sm">등록된 배너가 없습니다</p>
            <p className="text-xs">위의 &quot;배너 추가&quot; 버튼을 클릭하여 첫 배너를 만들어보세요</p>
        </div>
    );
}

// ─── Data hooks ──────────────────────────────────────────

async function loadBanners(): Promise<BannerItem[]> {
    const res = await fetch(API_PATH);
    const json = await res.json() as { banners: BannerItem[] };
    return json.banners ?? [];
}

function useBanners(authLoading: boolean): { banners: BannerItem[]; loading: boolean; reload: () => Promise<void> } {
    const [banners, setBanners] = useState<BannerItem[]>([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        const items = await loadBanners().catch(() => [] as BannerItem[]);
        setBanners(items);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (authLoading) return;
        let cancelled = false;
        loadBanners().then((items) => { if (!cancelled) { setBanners(items); setLoading(false); } }).catch(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [authLoading]);

    return { banners, loading, reload };
}

// ─── Main Page ───────────────────────────────────────────

function useBannerActions(banners: BannerItem[], reload: () => Promise<void>): {
    saving: boolean; editingId: string | null; showCreate: boolean;
    setEditingId: (id: string | null) => void; setShowCreate: (v: boolean) => void;
    handleCreate: (data: BannerFormData) => Promise<void>;
    handleUpdate: (data: BannerFormData) => Promise<void>;
    handleDelete: (id: string) => Promise<void>;
    handleToggle: (b: BannerItem) => Promise<void>;
    handleMove: (idx: number, dir: "up" | "down") => Promise<void>;
} {
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const handleCreate = useCallback(async (data: BannerFormData) => {
        setSaving(true);
        const maxOrder = banners.reduce((max, b) => Math.max(max, b.order_index), -1);
        await apiFetch("POST", { ...formToPayload(data), order_index: maxOrder + 1 });
        setShowCreate(false);
        await reload();
        setSaving(false);
    }, [banners, reload]);

    const handleUpdate = useCallback(async (data: BannerFormData) => {
        if (!editingId) return;
        setSaving(true);
        await apiFetch("PATCH", { id: editingId, ...formToPayload(data) });
        setEditingId(null);
        await reload();
        setSaving(false);
    }, [editingId, reload]);

    const handleDelete = useCallback(async (id: string) => {
        if (!globalThis.confirm("배너를 삭제하시겠습니까?")) return;
        await apiFetch("DELETE", { id });
        await reload();
    }, [reload]);

    const handleToggle = useCallback(async (b: BannerItem) => {
        await apiFetch("PATCH", { id: b.id, is_active: !b.is_active });
        await reload();
    }, [reload]);

    /* eslint-disable security/detect-object-injection -- Safe: accessing array by numeric index */
    const handleMove = useCallback(async (idx: number, dir: "up" | "down") => {
        const swapIdx = dir === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= banners.length) return;
        const a = banners[idx];
        const b = banners[swapIdx];
        await Promise.all([
            apiFetch("PATCH", { id: a.id, order_index: b.order_index }),
            apiFetch("PATCH", { id: b.id, order_index: a.order_index }),
        ]);
        await reload();
    }, [banners, reload]);
    /* eslint-enable security/detect-object-injection */

    return { saving, editingId, showCreate, setEditingId, setShowCreate, handleCreate, handleUpdate, handleDelete, handleToggle, handleMove };
}

function BannerListSection({ banners, actions }: Readonly<{
    banners: BannerItem[];
    actions: ReturnType<typeof useBannerActions>;
}>): React.ReactElement {
    return (
        <section className="space-y-3">
            {banners.length === 0 ? <EmptyState /> : null}
            {banners.map((banner, i) => (
                <BannerRow
                    key={banner.id}
                    banner={banner}
                    onEdit={() => { actions.setEditingId(banner.id); actions.setShowCreate(false); }}
                    onDelete={() => actions.handleDelete(banner.id)}
                    onToggle={() => actions.handleToggle(banner)}
                    onMove={(dir) => actions.handleMove(i, dir)}
                    isFirst={i === 0}
                    isLast={i === banners.length - 1}
                />
            ))}
        </section>
    );
}

export default function HeroBannersPage(): React.ReactElement {
    const { isLoading: authLoading } = useAuth();
    const { banners, loading, reload } = useBanners(authLoading);
    const actions = useBannerActions(banners, reload);

    if (authLoading || loading) return <AdminLoadingSpinner accentColor="amber" />;

    const editingBanner = actions.editingId ? banners.find((b) => b.id === actions.editingId) : null;

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="flex items-center justify-between">
                <AdminPageHeader title="히어로 배너 관리" count={banners.length} countLabel="개" />
                <button type="button" onClick={() => { actions.setShowCreate(true); actions.setEditingId(null); }} className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Plus className="h-4 w-4" /> 배너 추가
                </button>
            </div>

            {actions.showCreate ? (
                <section>
                    <h2 className="mb-3 text-sm font-bold text-zinc-300">새 배너 만들기</h2>
                    <BannerForm initial={EMPTY_FORM} onSave={actions.handleCreate} onCancel={() => actions.setShowCreate(false)} saving={actions.saving} />
                </section>
            ) : null}

            {editingBanner ? (
                <section>
                    <h2 className="mb-3 text-sm font-bold text-zinc-300">배너 수정</h2>
                    <BannerForm initial={bannerToForm(editingBanner)} onSave={actions.handleUpdate} onCancel={() => actions.setEditingId(null)} saving={actions.saving} />
                </section>
            ) : null}

            <BannerListSection banners={banners} actions={actions} />
        </div>
    );
}
