// @client-reason: Modal with artist search, duration selector, portfolio multi-select, focus trap, listbox keyboard nav
"use client";
/* eslint-disable max-lines-per-function */

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Search, Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";
import {
    VALID_GRANT_MONTHS,
    MIN_SEARCH_LENGTH,
    SEARCH_DEBOUNCE_MS,
    ARTIST_SEARCH_RESULT_LIMIT,
    DEFAULT_MAX_PORTFOLIOS,
} from "@/lib/supabase/ad-constants";
import { PortfolioThumb, type AdminPortfolioOption } from "@/components/admin/PortfolioThumb";

interface ArtistOption {
    id: string;
    title: string;
    profile_image_path: string | null;
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ─── Focus Trap & Initial Focus ──────────────────────────

function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>): void {
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // 모달 열릴 때 첫 focusable 에 초기 포커스
        const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        firstFocusable?.focus();

        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.key !== "Tab") return;
            const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement as HTMLElement | null;
            if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };
        container.addEventListener("keydown", onKeyDown);
        return () => container.removeEventListener("keydown", onKeyDown);
    }, [containerRef]);
}

// ─── Artist Search ───────────────────────────────────────

interface SearchState {
    results: ArtistOption[];
    loading: boolean;
    error: string | null;
}

function useArtistSearch(query: string): SearchState {
    const [state, setState] = useState<SearchState>({ results: [], loading: false, error: null });

    useEffect(() => {
        if (query.trim().length < MIN_SEARCH_LENGTH) {
            setState({ results: [], loading: false, error: null });
            return;
        }
        const handler = setTimeout(async () => {
            setState((prev) => ({ ...prev, loading: true, error: null }));
            try {
                const params = new URLSearchParams({ q: query, limit: String(ARTIST_SEARCH_RESULT_LIMIT) });
                const res = await fetch(`/api/admin/artists/search?${params.toString()}`);
                if (!res.ok) {
                    const err = await res.json() as { error?: string };
                    throw new Error(err.error ?? "검색 실패");
                }
                const data = await res.json() as { artists?: ArtistOption[] };
                setState({ results: data.artists ?? [], loading: false, error: null });
            } catch (e: unknown) {
                setState({ results: [], loading: false, error: e instanceof Error ? e.message : "네트워크 오류" });
            }
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(handler);
    }, [query]);

    return state;
}

function SelectedArtistChip({ artist, onClear }: Readonly<{
    artist: ArtistOption; onClear: () => void;
}>): React.ReactElement {
    return (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <div className="flex items-center gap-3">
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-700">
                    {artist.profile_image_path ? (
                        <Image src={artist.profile_image_path} alt="" fill sizes="32px" className="object-cover" />
                    ) : null}
                </div>
                <span className="text-sm font-medium text-white">{artist.title}</span>
            </div>
            <button
                type="button"
                onClick={onClear}
                aria-label="아티스트 선택 취소"
                className="min-h-[44px] min-w-[44px] rounded p-1 text-zinc-300 motion-safe:transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:text-white"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

// ─── Listbox Keyboard Nav ───────────────────────────────

function ArtistSearchInput({ value, onChange, onArrowDown, hasResults }: Readonly<{
    value: string; onChange: (v: string) => void;
    onArrowDown: () => void; hasResults: boolean;
}>): React.ReactElement {
    const onKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === "ArrowDown" && hasResults) { e.preventDefault(); onArrowDown(); }
    };
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-300" aria-hidden="true" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKey}
                placeholder={`샵 이름·닉네임·아이디 검색 (${MIN_SEARCH_LENGTH}자 이상)`}
                aria-label="샵 이름, 닉네임, 아이디로 아티스트 검색"
                aria-controls="artist-search-results"
                aria-expanded={hasResults}
                aria-autocomplete="list"
                role="combobox"
                autoComplete="off"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none"
            />
        </div>
    );
}

function ArtistResultItem({ r, onSelect, refCallback, onKey }: Readonly<{
    r: ArtistOption;
    onSelect: () => void;
    refCallback: (el: HTMLButtonElement | null) => void;
    onKey: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}>): React.ReactElement {
    return (
        <li role="option" aria-selected={false}>
            <button
                ref={refCallback}
                type="button"
                onClick={onSelect}
                onKeyDown={onKey}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-white motion-safe:transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-zinc-700">
                    {r.profile_image_path ? (
                        <Image src={r.profile_image_path} alt="" fill sizes="28px" className="object-cover" />
                    ) : null}
                </div>
                <span>{r.title}</span>
            </button>
        </li>
    );
}

function ArtistSearchSection({ selected, onSelect }: Readonly<{
    selected: ArtistOption | null;
    onSelect: (a: ArtistOption | null) => void;
}>): React.ReactElement {
    const [query, setQuery] = useState("");
    const { results, loading, error } = useArtistSearch(query);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    if (selected) {
        return <SelectedArtistChip artist={selected} onClear={() => onSelect(null)} />;
    }

    const focusItem = (idx: number): void => {
        const len = results.length;
        if (len === 0) return;
        const safe = ((idx % len) + len) % len;
        itemRefs.current[safe]?.focus();
    };

    const onItemKey = (i: number) => (e: React.KeyboardEvent<HTMLButtonElement>): void => {
        if (e.key === "ArrowDown") { e.preventDefault(); focusItem(i + 1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(i - 1); }
    };

    const hasResults = results.length > 0;
    return (
        <div>
            <ArtistSearchInput
                value={query}
                onChange={setQuery}
                onArrowDown={() => focusItem(0)}
                hasResults={hasResults}
            />
            {loading && (
                <div className="mt-1 flex items-center gap-2 px-1 text-xs text-zinc-300">
                    <Loader2 className="h-3 w-3 motion-safe:animate-spin" aria-hidden="true" />
                    <span aria-live="polite">검색 중…</span>
                </div>
            )}
            {error && (
                <div role="alert" className="mt-1 flex items-center gap-1.5 rounded bg-red-500/20 px-3 py-2 text-xs text-red-200">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {error}
                </div>
            )}
            {hasResults && (
                <ul
                    id="artist-search-results"
                    role="listbox"
                    aria-label="아티스트 검색 결과"
                    className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-zinc-900"
                >
                    {results.map((r, i) => (
                        <ArtistResultItem
                            key={r.id}
                            r={r}
                            onSelect={() => { onSelect(r); setQuery(""); }}
                            refCallback={(el) => { itemRefs.current[i] = el; }}
                            onKey={onItemKey(i)}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

// ─── Portfolio Selection ────────────────────────────────

interface PortfoliosState {
    portfolios: AdminPortfolioOption[];
    maxPortfolios: number;
    loading: boolean;
    error: string | null;
}

function usePortfolios(artistId: string | null): PortfoliosState {
    const [state, setState] = useState<PortfoliosState>({
        portfolios: [], maxPortfolios: DEFAULT_MAX_PORTFOLIOS, loading: false, error: null,
    });

    useEffect(() => {
        if (!artistId) {
            setState({ portfolios: [], maxPortfolios: DEFAULT_MAX_PORTFOLIOS, loading: false, error: null });
            return;
        }
        let cancelled = false;
        setState((prev) => ({ ...prev, loading: true, error: null }));
        (async () => {
            try {
                const res = await fetch(`/api/admin/artists/${artistId}/portfolios`);
                if (!res.ok) {
                    const err = await res.json() as { error?: string };
                    throw new Error(err.error ?? "포트폴리오 조회 실패");
                }
                const data = await res.json() as { portfolios?: AdminPortfolioOption[]; maxPortfolios?: number };
                if (!cancelled) {
                    setState({
                        portfolios: data.portfolios ?? [],
                        maxPortfolios: data.maxPortfolios ?? DEFAULT_MAX_PORTFOLIOS,
                        loading: false,
                        error: null,
                    });
                }
            } catch (e: unknown) {
                if (!cancelled) {
                    setState({
                        portfolios: [], maxPortfolios: DEFAULT_MAX_PORTFOLIOS, loading: false,
                        error: e instanceof Error ? e.message : "네트워크 오류",
                    });
                }
            }
        })();
        return () => { cancelled = true; };
    }, [artistId]);

    return state;
}

function PortfolioGrid({ artistId, selected, onChange }: Readonly<{
    artistId: string; selected: Set<string>; onChange: React.Dispatch<React.SetStateAction<Set<string>>>;
}>): React.ReactElement {
    const { portfolios, maxPortfolios, loading, error } = usePortfolios(artistId);

    // setState updater 패턴 — prev 로 최신 state 참조해 deps 에 selected 제외.
    // 결과: handleToggle 안정화 → PortfolioThumb React.memo 발휘 (50개 그리드에서 리렌더 1회).
    const handleToggle = useCallback((id: string) => {
        onChange((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else if (next.size < maxPortfolios) {
                next.add(id);
            }
            return next;
        });
    }, [maxPortfolios, onChange]);

    if (loading) {
        return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 motion-safe:animate-spin text-zinc-300" aria-hidden="true" /></div>;
    }
    if (error) {
        return <p className="rounded-lg bg-red-500/20 p-3 text-center text-xs text-red-200" role="alert">{error}</p>;
    }
    if (portfolios.length === 0) {
        return <p className="rounded-lg bg-white/5 p-4 text-center text-xs text-zinc-300">이 아티스트는 등록된 작품이 없습니다.</p>;
    }

    const atLimit = selected.size >= maxPortfolios;
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-300">
                <span>부스트할 작품 선택 (선택 시 즉시 광고 시작)</span>
                <span className={atLimit ? "text-emerald-300" : ""}>{selected.size} / {maxPortfolios}</span>
            </div>
            <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2 md:grid-cols-4 lg:grid-cols-5">
                {portfolios.map((p) => (
                    <PortfolioThumb
                        key={p.id}
                        p={p}
                        selected={selected.has(p.id)}
                        disabled={atLimit}
                        onToggle={handleToggle}
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
    onSlotsChange: React.Dispatch<React.SetStateAction<Set<string>>>;
}>): React.ReactElement {
    return (
        <div className="space-y-5 p-5">
            <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">1. 아티스트 선택</label>
                <ArtistSearchSection selected={artist} onSelect={onArtistSelect} />
            </div>
            <div>
                <label htmlFor="grant-months" className="mb-1.5 block text-xs font-medium text-zinc-300">2. 부여 기간</label>
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
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">3. 부스트할 작품 선택 (선택사항)</label>
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
    const dialogRef = useRef<HTMLDivElement>(null);

    useFocusTrap(dialogRef);

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
            setMsg(e instanceof Error ? e.message : "네트워크 오류");
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
            <div ref={dialogRef} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                    <h2 id="new-grant-title" className="text-base font-semibold text-white">새 무료 광고 부여</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="닫기"
                        className="min-h-[44px] min-w-[44px] rounded p-1 text-zinc-300 motion-safe:transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:bg-white/10"
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
                    <span className="text-xs text-zinc-300" aria-live="polite" aria-atomic="true">
                        {msg ?? "선택 후 부여 클릭"}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="min-h-[44px] rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white motion-safe:transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:bg-white/20"
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            disabled={busy || !artist}
                            aria-busy={busy}
                            onClick={() => void handleGrant()}
                            className="min-h-[44px] rounded-lg bg-emerald-500 px-5 py-2 text-sm font-medium text-white motion-safe:transition-colors hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:bg-emerald-600 disabled:opacity-50"
                        >
                            {busy ? "부여중..." : "광고 부여"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
