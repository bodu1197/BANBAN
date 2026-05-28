// @client-reason: Modal with artist search, duration selector, and portfolio multi-select
"use client";
/* eslint-disable max-lines-per-function */

import { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";
import Image from "next/image";
import { VALID_GRANT_MONTHS } from "@/lib/supabase/ad-constants";
import { PortfolioThumb, type AdminPortfolioOption } from "@/components/admin/PortfolioThumb";

interface ArtistOption {
    id: string;
    title: string;
    profile_image_path: string | null;
}

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

// ─── Artist Search ───────────────────────────────────────

function useArtistSearch(query: string): { results: ArtistOption[]; loading: boolean } {
    const [results, setResults] = useState<ArtistOption[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (query.trim().length < MIN_SEARCH_LENGTH) {
            setResults([]);
            return;
        }
        const handler = setTimeout(async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ q: query, limit: "10" });
                const res = await fetch(`/api/admin/artists/search?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json() as { artists?: ArtistOption[] };
                    setResults(data.artists ?? []);
                }
            } finally {
                setLoading(false);
            }
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(handler);
    }, [query]);

    return { results, loading };
}

function SelectedArtistChip({ artist, onClear }: Readonly<{
    artist: ArtistOption; onClear: () => void;
}>): React.ReactElement {
    return (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <div className="flex items-center gap-3">
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-700">
                    {artist.profile_image_path ? (
                        <Image src={artist.profile_image_path} alt={artist.title} fill sizes="32px" className="object-cover" />
                    ) : null}
                </div>
                <span className="text-sm font-medium text-white">{artist.title}</span>
            </div>
            <button
                type="button"
                onClick={onClear}
                aria-label="아티스트 선택 취소"
                className="min-h-[36px] min-w-[36px] rounded p-1 text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:text-white"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

function ArtistSearchSection({ selected, onSelect }: Readonly<{
    selected: ArtistOption | null;
    onSelect: (a: ArtistOption | null) => void;
}>): React.ReactElement {
    const [query, setQuery] = useState("");
    const { results, loading } = useArtistSearch(query);

    if (selected) {
        return <SelectedArtistChip artist={selected} onClear={() => onSelect(null)} />;
    }

    const hasResults = results.length > 0;
    return (
        <div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="샵 이름으로 검색 (2자 이상)"
                    aria-label="아티스트 검색"
                    aria-controls="artist-search-results"
                    aria-expanded={hasResults}
                    autoComplete="off"
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
                {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />}
            </div>
            {hasResults && (
                <ul id="artist-search-results" role="listbox" className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-zinc-900">
                    {results.map((r) => (
                        <li key={r.id} role="option" aria-selected={false}>
                            <button
                                type="button"
                                onClick={() => { onSelect(r); setQuery(""); }}
                                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-white hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-zinc-700">
                                    {r.profile_image_path ? (
                                        <Image src={r.profile_image_path} alt={r.title} fill sizes="28px" className="object-cover" />
                                    ) : null}
                                </div>
                                <span>{r.title}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ─── Portfolio Selection ────────────────────────────────

function usePortfolios(artistId: string | null): { portfolios: AdminPortfolioOption[]; maxPortfolios: number; loading: boolean } {
    const [portfolios, setPortfolios] = useState<AdminPortfolioOption[]>([]);
    const [maxPortfolios, setMaxPortfolios] = useState(3);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!artistId) {
            setPortfolios([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const res = await fetch(`/api/admin/artists/${artistId}/portfolios`);
                if (res.ok && !cancelled) {
                    const data = await res.json() as { portfolios?: AdminPortfolioOption[]; maxPortfolios?: number };
                    setPortfolios(data.portfolios ?? []);
                    setMaxPortfolios(data.maxPortfolios ?? 3);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [artistId]);

    return { portfolios, maxPortfolios, loading };
}

function PortfolioGrid({ artistId, selected, onChange }: Readonly<{
    artistId: string; selected: Set<string>; onChange: (next: Set<string>) => void;
}>): React.ReactElement {
    const { portfolios, maxPortfolios, loading } = usePortfolios(artistId);

    const handleToggle = useCallback((id: string) => {
        const next = new Set(selected);
        if (next.has(id)) {
            next.delete(id);
        } else if (next.size < maxPortfolios) {
            next.add(id);
        }
        onChange(next);
    }, [selected, maxPortfolios, onChange]);

    if (loading) {
        return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>;
    }
    if (portfolios.length === 0) {
        return <p className="rounded-lg bg-white/5 p-4 text-center text-xs text-zinc-400">이 아티스트는 등록된 작품이 없습니다.</p>;
    }

    const atLimit = selected.size >= maxPortfolios;
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>부스트할 작품 선택 (선택 시 즉시 광고 시작)</span>
                <span className={atLimit ? "text-emerald-400" : ""}>{selected.size} / {maxPortfolios}</span>
            </div>
            <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2 md:grid-cols-4 lg:grid-cols-5">
                {portfolios.map((p) => (
                    <PortfolioThumb
                        key={p.id}
                        p={p}
                        selected={selected.has(p.id)}
                        disabled={atLimit}
                        onToggle={() => handleToggle(p.id)}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Modal Form ──────────────────────────────────────────

function GrantFormBody({ artist, months, selectedSlots, onArtistSelect, onMonthsChange, onSlotsChange }: Readonly<{
    artist: ArtistOption | null;
    months: number;
    selectedSlots: Set<string>;
    onArtistSelect: (a: ArtistOption | null) => void;
    onMonthsChange: (m: number) => void;
    onSlotsChange: (s: Set<string>) => void;
}>): React.ReactElement {
    return (
        <div className="space-y-5 p-5">
            <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">1. 아티스트 선택</label>
                <ArtistSearchSection selected={artist} onSelect={onArtistSelect} />
            </div>
            <div>
                <label htmlFor="grant-months" className="mb-1.5 block text-xs font-medium text-zinc-400">2. 부여 기간</label>
                <select
                    id="grant-months"
                    value={months}
                    onChange={(e) => onMonthsChange(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                    {VALID_GRANT_MONTHS.map((m) => (
                        <option key={m} value={m}>{m}개월 무료</option>
                    ))}
                </select>
            </div>
            {artist && (
                <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">3. 부스트할 작품 선택 (선택사항)</label>
                    <PortfolioGrid artistId={artist.id} selected={selectedSlots} onChange={onSlotsChange} />
                </div>
            )}
        </div>
    );
}

// ─── Main Modal ──────────────────────────────────────────

export function NewGrantModal({ onClose, onGranted }: Readonly<{
    onClose: () => void; onGranted: () => void;
}>): React.ReactElement {
    const [artist, setArtist] = useState<ArtistOption | null>(null);
    const [months, setMonths] = useState<number>(1);
    const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    // Esc 키 닫기 — 키보드 사용자 접근성
    useEffect(() => {
        const onKey = (e: KeyboardEvent): void => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const handleGrant = async (): Promise<void> => {
        if (!artist) { setMsg("아티스트를 선택해주세요."); return; }
        if (!globalThis.confirm(`"${artist.title}"에게 ${months}개월 무료 광고를 부여하시겠습니까?\n선택 작품: ${selectedSlots.size}개`)) return;
        setBusy(true);
        setMsg(null);
        try {
            const res = await fetch("/api/admin/ads/grant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    artistId: artist.id,
                    durationMonths: months,
                    portfolioIds: [...selectedSlots],
                }),
            });
            if (res.ok) {
                onGranted();
            } else {
                const err = await res.json() as { error?: string };
                setMsg(err.error ?? "부여 실패");
            }
        } catch (e: unknown) {
            setMsg(e instanceof Error ? e.message : "오류 발생");
        } finally {
            setBusy(false);
        }
    };

    const handleArtistSelect = (a: ArtistOption | null): void => { setArtist(a); setSelectedSlots(new Set()); };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-grant-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                    <h2 id="new-grant-title" className="text-base font-semibold text-white">새 무료 광고 부여</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="닫기"
                        className="min-h-[44px] min-w-[44px] rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:bg-white/10"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <GrantFormBody
                    artist={artist}
                    months={months}
                    selectedSlots={selectedSlots}
                    onArtistSelect={handleArtistSelect}
                    onMonthsChange={setMonths}
                    onSlotsChange={setSelectedSlots}
                />
                <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-5 py-3">
                    <span className="text-xs text-zinc-400" aria-live="polite" aria-atomic="true">
                        {msg ?? "선택 후 부여 클릭"}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="min-h-[44px] rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:bg-white/20"
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            disabled={busy || !artist}
                            aria-busy={busy}
                            onClick={() => void handleGrant()}
                            className="min-h-[44px] rounded-lg bg-emerald-500 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:bg-emerald-600 disabled:opacity-50"
                        >
                            {busy ? "부여중..." : "광고 부여"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
