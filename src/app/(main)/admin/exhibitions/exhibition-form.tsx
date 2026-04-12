// @client-reason: Exhibition form with image upload, category select, and date inputs
"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Upload, X, Save } from "lucide-react";
import { getStorageUrl } from "@/lib/supabase/storage-utils";
import type { ExhibitionFormData } from "./exhibition-types";
import { CATEGORIES } from "./exhibition-types";

// ─── Image Upload ────────────────────────────────────────

function UploadPlaceholder({ uploading, onClick }: Readonly<{
    uploading: boolean; onClick: () => void;
}>): React.ReactElement {
    return (
        <button type="button" onClick={onClick} disabled={uploading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 bg-white/5 py-10 text-zinc-400 transition-colors hover:border-orange-500/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
            <Image src={url} alt="미리보기" fill sizes="600px" className="object-cover" />
            <button type="button" aria-label="이미지 변경" onClick={onChangeClick}
                className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                변경
            </button>
        </div>
    );
}

function ExhibitionImageUpload({ currentPath, onUpload }: Readonly<{
    currentPath: string; onUpload: (path: string) => void;
}>): React.ReactElement {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const imageUrl = currentPath ? getStorageUrl(currentPath) : null;

    const handleFile = useCallback(async (file: File) => {
        setUploading(true);
        try {
            const form = new globalThis.FormData();
            form.append("file", file);
            const res = await fetch("/api/upload?bucket=portfolios&folder=exhibitions", { method: "POST", body: form });
            const json = await res.json() as { success: boolean; paths?: { original: string } };
            if (json.success && json.paths) onUpload(json.paths.original);
        } catch { /* upload failed */ }
        setUploading(false);
    }, [onUpload]);

    const openPicker = useCallback(() => fileRef.current?.click(), []);

    return (
        <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">기획전 이미지</label>
            {imageUrl ? <ImagePreview url={imageUrl} onChangeClick={openPicker} /> : <UploadPlaceholder uploading={uploading} onClick={openPicker} />}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
    );
}

// ─── Form Inputs ─────────────────────────────────────────

function TextInput({ label, value, onChange, placeholder, icon }: Readonly<{
    label: string; value: string; onChange: (v: string) => void; placeholder: string; icon?: React.ReactNode;
}>): React.ReactElement {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">{icon}{label}</label>
            <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none" />
        </div>
    );
}

function DateInput({ label, value, onChange }: Readonly<{
    label: string; value: string; onChange: (v: string) => void;
}>): React.ReactElement {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">{label}</label>
            <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none" />
        </div>
    );
}

function CategorySelect({ value, onChange }: Readonly<{
    value: string; onChange: (v: string) => void;
}>): React.ReactElement {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">카테고리</label>
            <select value={value} onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
        </div>
    );
}

// ─── Form Actions ────────────────────────────────────────

function FormActions({ onCancel, onSave, disabled }: Readonly<{
    onCancel: () => void; onSave: () => void; disabled: boolean;
}>): React.ReactElement {
    return (
        <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X className="h-4 w-4" /> 취소
            </button>
            <button type="button" onClick={onSave} disabled={disabled} className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40">
                <Save className="h-4 w-4" /> 저장
            </button>
        </div>
    );
}

// ─── Exhibition Form ─────────────────────────────────────

export default function ExhibitionForm({ initial, onSave, onCancel, saving }: Readonly<{
    initial: ExhibitionFormData; onSave: (data: ExhibitionFormData) => void; onCancel: () => void; saving: boolean;
}>): React.ReactElement {
    const [form, setForm] = useState<ExhibitionFormData>(initial);
    const set = useCallback(<K extends keyof ExhibitionFormData>(key: K, val: ExhibitionFormData[K]) => {
        setForm((prev) => ({ ...prev, [key]: val }));
    }, []);

    return (
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <ExhibitionImageUpload currentPath={form.image_path} onUpload={(p) => set("image_path", p)} />
            <div className="grid gap-4 md:grid-cols-2">
                <TextInput label="제목" value={form.title} onChange={(v) => set("title", v)} placeholder="예: 봄맞이 할인 기획전" />
                <TextInput label="부제목" value={form.subtitle} onChange={(v) => set("subtitle", v)} placeholder="예: 최대 50% 할인" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <CategorySelect value={form.category} onChange={(v) => set("category", v)} />
                <div className="flex items-end gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                        <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/5 accent-orange-500" />
                        활성화
                    </label>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <DateInput label="시작일 (선택)" value={form.start_at} onChange={(v) => set("start_at", v)} />
                <DateInput label="종료일 (선택)" value={form.end_at} onChange={(v) => set("end_at", v)} />
            </div>
            <FormActions onCancel={onCancel} onSave={() => onSave(form)} disabled={saving || !form.title || !form.image_path} />
        </div>
    );
}
