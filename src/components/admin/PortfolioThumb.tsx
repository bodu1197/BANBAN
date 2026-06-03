// @client-reason: Image rendering + interactive selection for admin portfolio pickers
"use client";

import { memo } from "react";
import Image from "next/image";
import { ImageIcon, Check } from "lucide-react";

export interface AdminPortfolioOption {
    id: string;
    title: string;
    thumbnail: string | null;
}

interface Props {
    p: AdminPortfolioOption;
    selected: boolean;
    disabled: boolean;
    /** id 기반 콜백 — 부모는 useCallback 한 번만 만들면 모든 thumb 가 동일 ref 공유 → memo 효과 발휘 */
    onToggle: (id: string) => void;
}

// disabled 시 opacity 만으로는 텍스트 대비 미달 → grayscale + 불투명도 조정
function getBorderCls(selected: boolean, disabled: boolean): string {
    if (selected) {
        return "border-emerald-500 ring-2 ring-emerald-500/30";
    }
    if (disabled) {
        return "border-white/10 opacity-60 cursor-not-allowed grayscale";
    }
    return "border-white/10 hover:border-emerald-300";
}

function PortfolioThumbImpl({ p, selected, disabled, onToggle }: Readonly<Props>): React.ReactElement {
    const borderCls = getBorderCls(selected, disabled);
    return (
        <button
            type="button"
            onClick={() => onToggle(p.id)}
            disabled={disabled && !selected}
            aria-pressed={selected}
            aria-label={`${p.title} ${selected ? "선택됨" : "선택"}`}
            className={`relative aspect-square overflow-hidden rounded-lg border-2 motion-safe:transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${borderCls}`}
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

/** React.memo — selected/disabled/onToggle 안정화되면 50개 그리드에서도 리렌더 1회만 */
export const PortfolioThumb = memo(PortfolioThumbImpl);
