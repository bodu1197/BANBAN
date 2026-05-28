// @client-reason: Image rendering + interactive selection for admin portfolio pickers
"use client";

import Image from "next/image";
import { ImageIcon, Check } from "lucide-react";

export interface AdminPortfolioOption {
    id: string;
    title: string;
    thumbnail: string | null;
}

export function PortfolioThumb({ p, selected, disabled, onToggle }: Readonly<{
    p: AdminPortfolioOption; selected: boolean; disabled: boolean; onToggle: () => void;
}>): React.ReactElement {
    // disabled 시 opacity-40 만으로는 텍스트 대비 미달 → 배경/텍스트 명시적으로 조정
    const borderCls = selected
        ? "border-emerald-500 ring-2 ring-emerald-500/30"
        : disabled
            ? "border-white/10 opacity-60 cursor-not-allowed grayscale"
            : "border-white/10 hover:border-emerald-300";
    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={disabled && !selected}
            aria-pressed={selected}
            aria-label={`${p.title} ${selected ? "선택됨" : "선택"}`}
            className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${borderCls}`}
        >
            {p.thumbnail ? (
                <Image src={p.thumbnail} alt={p.title} fill sizes="100px" className="object-cover" />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                    <ImageIcon className="h-6 w-6 text-zinc-600" />
                </div>
            )}
            {selected && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/30">
                    <div className="rounded-full bg-emerald-500 p-1"><Check className="h-3 w-3 text-white" /></div>
                </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
                <p className="truncate text-[10px] text-white">{p.title}</p>
            </div>
        </button>
    );
}
