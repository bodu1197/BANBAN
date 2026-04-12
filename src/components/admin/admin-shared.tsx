// @client-reason: Interactive search bar with state management
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

// ─── SearchBar ──────────────────────────────────────────

export function AdminSearchBar({ onSearch, placeholder, accentColor }: Readonly<{
    onSearch: (q: string) => void;
    placeholder?: string;
    accentColor?: string;
}>): React.ReactElement {
    const [input, setInput] = useState("");
    const accent = accentColor ?? "pink";
    const submit = (): void => onSearch(input);
    return (
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                    type="text"
                    placeholder={placeholder ?? "검색..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                    className={`w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-${accent}-500 focus:outline-none`}
                />
            </div>
            <button
                type="button"
                className={`shrink-0 rounded-lg bg-${accent}-500 px-4 py-2 text-sm font-medium text-white hover:bg-${accent}-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-${accent}-600`}
                onClick={submit}
            >
                검색
            </button>
        </div>
    );
}

// ─── Pagination ─────────────────────────────────────────

export function AdminPagination({ currentPage, total, limit, onPageChange }: Readonly<{
    currentPage: number; total: number; limit: number; onPageChange: (p: number) => void;
}>): React.ReactElement | null {
    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-2 py-4">
            <button type="button" disabled={currentPage <= 1} aria-label="이전 페이지" className="rounded-lg bg-white/10 p-2 text-white disabled:opacity-30 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/20" onClick={() => onPageChange(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-zinc-400">{currentPage} / {totalPages}</span>
            <button type="button" disabled={currentPage >= totalPages} aria-label="다음 페이지" className="rounded-lg bg-white/10 p-2 text-white disabled:opacity-30 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/20" onClick={() => onPageChange(currentPage + 1)}>
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    );
}

// ─── SearchResetBadge ───────────────────────────────────

export function AdminSearchResetBadge({ search, onReset, accentColor }: Readonly<{
    search: string; onReset: () => void; accentColor?: string;
}>): React.ReactElement | null {
    if (!search) return null;
    const accent = accentColor ?? "pink";
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">&quot;{search}&quot; 검색 결과</span>
            <button type="button" className={`text-xs text-${accent}-400 hover:underline focus-visible:underline focus-visible:outline-none`} onClick={onReset}>초기화</button>
        </div>
    );
}

// ─── Loading / Error States ─────────────────────────────

export function AdminLoadingSpinner({ accentColor }: Readonly<{ accentColor?: string }>): React.ReactElement {
    const accent = accentColor ?? "pink";
    return (
        <div className="flex h-full min-h-[400px] items-center justify-center">
            <div className={`h-8 w-8 animate-spin rounded-full border-2 border-${accent}-500 border-t-transparent`} />
        </div>
    );
}

export function AdminErrorState({ message }: Readonly<{ message: string }>): React.ReactElement {
    const router = useRouter();
    return (
        <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4">
            <p className="text-red-400">{message}</p>
            <button type="button" onClick={() => router.push("/")} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/20">홈으로</button>
        </div>
    );
}

// ─── Page Header ────────────────────────────────────────

export function AdminPageHeader({ title, count, countLabel }: Readonly<{
    title: string; count?: number; countLabel?: string;
}>): React.ReactElement {
    return (
        <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">{title}</h1>
            {count !== undefined && (
                <span className="text-sm text-zinc-400">{count.toLocaleString()}{countLabel ?? "건"}</span>
            )}
        </div>
    );
}
