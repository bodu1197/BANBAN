// @client-reason: Portfolio edit form fields (title, description, prices, date)
"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { getStorageUrl } from "@/lib/supabase/storage-utils";
import type { PortfolioForm, MediaItem } from "./edit-types";

// ─── Form Fields ─────────────────────────────────────────

const INPUT_CLS = "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none";

export function FormFields({ form, setForm }: Readonly<{
    form: PortfolioForm;
    setForm: (f: PortfolioForm) => void;
}>): React.ReactElement {
    return (
        <div className="space-y-5">
            <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">제목 <span className="text-red-400">*</span></label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">설명</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} className={`${INPUT_CLS} resize-y`} />
            </div>
            {/* Price/sale fields hidden — purchase/sale feature disabled */}
        </div>
    );
}

// ─── Media Grid ──────────────────────────────────────────

export function MediaGrid({ media, deletedIds, onDelete }: Readonly<{
    media: MediaItem[];
    deletedIds: Set<string>;
    onDelete: (id: string) => void;
}>): React.ReactElement {
    const activeMedia = media.filter((m) => !deletedIds.has(m.id));
    if (activeMedia.length === 0) return <p className="text-sm text-zinc-500">이미지가 없습니다.</p>;
    return (
        <div className="flex flex-wrap gap-3">
            {activeMedia.map((m) => (
                <div key={m.id} className="group relative">
                    <Image src={getStorageUrl(m.storage_path) ?? ""} alt="" width={120} height={120} unoptimized className="h-28 w-28 rounded-lg border border-white/10 object-cover" />
                    <button
                        type="button"
                        aria-label="이미지 삭제"
                        onClick={() => onDelete(m.id)}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            ))}
        </div>
    );
}
