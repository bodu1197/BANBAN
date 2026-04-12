// @client-reason: Exhibition row with toggle, edit, delete, and reorder actions
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pencil, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, GripVertical, Users } from "lucide-react";
import { getStorageUrl } from "@/lib/supabase/storage-utils";
import type { ExhibitionItem } from "./exhibition-types";
import { categoryLabel, categoryColor } from "./exhibition-types";

// ─── Sub-components ──────────────────────────────────────

function ExhibitionInfo({ item }: Readonly<{ item: ExhibitionItem }>): React.ReactElement {
    return (
        <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-white">{item.title}</h3>
            {item.subtitle ? <p className="mt-0.5 truncate text-xs text-zinc-400">{item.subtitle}</p> : null}
            <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${categoryColor(item.category)}`}>{categoryLabel(item.category)}</span>
<span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${item.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"}`}>
                    {item.is_active ? "활성" : "비활성"}
                </span>
                {item.pending_count > 0 ? (
                    <span className="animate-pulse rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400">
                        신규 {item.pending_count}건
                    </span>
                ) : null}
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

function EntryBadge({ item }: Readonly<{ item: ExhibitionItem }>): React.ReactElement | null {
    if (item.pending_count > 0) {
        return (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 animate-pulse items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {item.pending_count}
            </span>
        );
    }
    const totalCount = item.exhibition_entries?.[0]?.count ?? 0;
    if (totalCount > 0) {
        return (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-600 px-1 text-[9px] font-bold text-white">
                {totalCount}
            </span>
        );
    }
    return null;
}

function RowActions({ item, onEdit, onDelete, onToggle }: Readonly<{
    item: ExhibitionItem; onEdit: () => void; onDelete: () => void; onToggle: () => void;
}>): React.ReactElement {
    const pathname = usePathname();
    const cls = "rounded-lg p-2 text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
    return (
        <div className="flex shrink-0 items-center gap-1.5">
            <Link href={`${pathname}/${item.id}/entries`} aria-label="출품 관리" className={`${cls} relative hover:bg-white/10 hover:text-blue-400 focus-visible:bg-white/10 focus-visible:text-blue-400`}>
                <Users className="h-4 w-4" />
                <EntryBadge item={item} />
            </Link>
            <button type="button" onClick={onToggle} aria-label={item.is_active ? "비활성화" : "활성화"} aria-pressed={item.is_active} className={`${cls} hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white`}>
                {item.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button type="button" onClick={onEdit} aria-label="수정" className={`${cls} hover:bg-white/10 hover:text-orange-400 focus-visible:bg-white/10 focus-visible:text-orange-400`}>
                <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={onDelete} aria-label="삭제" className={`${cls} hover:bg-white/10 hover:text-red-400 focus-visible:bg-white/10 focus-visible:text-red-400`}>
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}

// ─── Exhibition Row ──────────────────────────────────────

export default function ExhibitionRow({ item, onEdit, onDelete, onToggle, onMove, isFirst, isLast }: Readonly<{
    item: ExhibitionItem; onEdit: () => void; onDelete: () => void; onToggle: () => void;
    onMove: (dir: "up" | "down") => void; isFirst: boolean; isLast: boolean;
}>): React.ReactElement {
    const imageUrl = getStorageUrl(item.image_path);
    return (
        <div className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${item.is_active ? "border-white/10 bg-white/[0.03]" : "border-white/5 bg-white/[0.01] opacity-60"}`}>
            <OrderButtons onMove={onMove} isFirst={isFirst} isLast={isLast} />
            <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 md:h-20 md:w-36">
                {imageUrl ? <Image src={imageUrl} alt={item.title} fill sizes="144px" className="object-cover" /> : <div className="flex h-full items-center justify-center bg-white/5 text-xs text-zinc-500">No Image</div>}
            </div>
            <ExhibitionInfo item={item} />
            <RowActions item={item} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />
        </div>
    );
}
