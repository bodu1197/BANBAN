// @client-reason: User interaction (image upload, search trigger, results display)
"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Search, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStorageUrl } from "@/lib/supabase/storage-utils";

interface SimilarResult {
    mediaId: string;
    portfolioId: string;
    storagePath: string;
    similarity: number;
    portfolio: {
        id: string;
        title: string;
        price: number;
        discount_rate: number;
        likes_count: number;
        artist: { id: string; title: string; region: { name: string } | null } | null;
    } | null;
}

type SearchStep = "input" | "searching" | "results";
// ─── Search Helpers ─────────────────────────────────────────────────────────

function buildSearchBody(preview: string | null): Record<string, unknown> | null {
    if (!preview) return null;
    return { image: preview.split(",").at(1), matchCount: 20, threshold: 0.3 };
}

async function executeSearch(body: Record<string, unknown>): Promise<SimilarResult[]> {
    const res = await fetch("/api/ai/search-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Search failed");
    const data = await res.json();
    return data.results ?? [];
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SimilarSearch(): React.ReactElement {
    const [step, setStep] = useState<SearchStep>("input");
    const [preview, setPreview] = useState<string | null>(null);
    const [results, setResults] = useState<SimilarResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((file: File) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
    }, []);

    const handleSearch = useCallback(async () => {
        const body = buildSearchBody(preview);
        if (!body) return;
        setStep("searching");
        setError(null);
        try {
            setResults(await executeSearch(body));
            setStep("results");
        } catch (err) {
            setError(err instanceof Error ? err.message : "검색 실패");
            setStep("input");
        }
    }, [preview]);

    const handleReset = useCallback(() => {
        setStep("input");
        setPreview(null);
        setResults([]);
        setError(null);
    }, []);

    return (
        <div className="flex flex-col gap-4">
            {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
            {step === "input" ? <UploadStep preview={preview} inputRef={inputRef} onFileSelect={handleFileSelect} onSearch={handleSearch} onClear={() => setPreview(null)} /> : null}
            {step === "searching" ? <SearchingIndicator /> : null}
            {step === "results" ? <ResultsStep results={results} preview={preview} searchQuery={null} onReset={handleReset} /> : null}
        </div>
    );
}

// ─── Searching Indicator ─────────────────────────────────────────────────────

function SearchingIndicator(): React.ReactElement {
    return (
        <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
            <p className="text-lg font-medium">유사 타투 검색 중...</p>
            <p className="text-sm text-muted-foreground">포트폴리오에서 비교 중</p>
        </div>
    );
}

// ─── Upload Step ─────────────────────────────────────────────────────────────

function UploadStep({ preview, inputRef, onFileSelect, onSearch, onClear }: Readonly<{
    preview: string | null;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onFileSelect: (file: File) => void;
    onSearch: () => void;
    onClear: () => void;
}>): React.ReactElement {
    return (
        <div className="flex flex-col gap-4">
            <div className="text-center">
                <p className="text-sm font-semibold">타투 사진으로 유사 작품 찾기</p>
                <p className="text-xs text-muted-foreground">타투 사진을 업로드하면 비슷한 포트폴리오를 찾아드립니다</p>
            </div>
            {preview ? <PreviewImage src={preview} onClear={onClear} /> : <UploadZone onClick={() => inputRef.current?.click()} />}
            <FileInput inputRef={inputRef} onFileSelect={onFileSelect} />
            <div className="flex gap-2">
                {preview ? (
                    <Button size="lg" className="flex-1 gap-2" onClick={onSearch}>
                        <Search className="h-4 w-4" />유사 타투 찾기
                    </Button>
                ) : (
                    <Button variant="outline" size="lg" className="flex-1 gap-2" onClick={() => inputRef.current?.click()}>
                        <Upload className="h-4 w-4" />사진 선택
                    </Button>
                )}
            </div>
        </div>
    );
}

function PreviewImage({ src, onClear }: Readonly<{ src: string; onClear: () => void }>): React.ReactElement {
    return (
        <div className="relative">
            <div className="overflow-hidden rounded-xl border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Upload preview" className="h-auto max-h-80 w-full object-contain" />
            </div>
            <button type="button" className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onClear} aria-label="이미지 제거">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

function UploadZone({ onClick }: Readonly<{ onClick: () => void }>): React.ReactElement {
    return (
        <button type="button" className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-input px-6 py-12 transition-colors hover:border-purple-400 hover:bg-purple-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-purple-400" onClick={onClick}>
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">타투 사진을 업로드하세요</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP 지원</p>
        </button>
    );
}

function FileInput({ inputRef, onFileSelect }: Readonly<{ inputRef: React.RefObject<HTMLInputElement | null>; onFileSelect: (file: File) => void }>): React.ReactElement {
    return (
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onFileSelect(file); }} />
    );
}

// ─── Results Step ────────────────────────────────────────────────────────────

function ResultsStep({ results, preview, searchQuery, onReset }: Readonly<{
    results: SimilarResult[];
    preview: string | null;
    searchQuery: string | null;
    onReset: () => void;
}>): React.ReactElement {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                    {results.length > 0 ? `유사 타투 ${String(results.length)}건 발견` : "유사한 타투를 찾지 못했습니다"}
                </p>
                <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
                    <Search className="h-3.5 w-3.5" />다시 검색
                </Button>
            </div>
            {preview ? (
                <div className="overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Searched image" className="h-24 w-full object-contain bg-muted/30" />
                </div>
            ) : null}
            {searchQuery ? (
                <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">검색어</p>
                    <p className="mt-1 text-sm">{searchQuery}</p>
                </div>
            ) : null}
            {results.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                    {results.map((r) => <SimilarCard key={r.mediaId} result={r} />)}
                </div>
            ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">임베딩된 포트폴리오가 부족하거나 유사한 타투가 없습니다</p>
            )}
        </div>
    );
}

// ─── Similar Card ────────────────────────────────────────────────────────────

function SimilarCard({ result }: Readonly<{ result: SimilarResult }>): React.ReactElement {
    const imageUrl = getStorageUrl(result.storagePath);
    const similarity = Math.round(result.similarity * 100);
    const { portfolio } = result;

    return (
        <a href={`/portfolios/${result.portfolioId}`} className="group overflow-hidden rounded-lg border transition-colors hover:border-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-purple-300">
            <CardImage src={imageUrl ?? ""} alt={portfolio?.title ?? "Similar tattoo"} similarity={similarity} />
            {portfolio ? <CardInfo portfolio={portfolio} /> : null}
        </a>
    );
}

function CardImage({ src, alt, similarity }: Readonly<{ src: string; alt: string; similarity: number }>): React.ReactElement {
    return (
        <div className="relative aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="h-full w-full object-cover transition-transform group-hover:scale-105 group-focus-visible:scale-105" loading="lazy" />
            <span className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">{String(similarity)}%</span>
        </div>
    );
}

function CardInfo({ portfolio }: Readonly<{ portfolio: NonNullable<SimilarResult["portfolio"]> }>): React.ReactElement {
    const artistLabel = [portfolio.artist?.title, portfolio.artist?.region?.name].filter(Boolean).join(" · ");

    return (
        <div className="p-2">
            <p className="truncate text-xs font-medium">{portfolio.title}</p>
            {artistLabel ? <p className="truncate text-[10px] text-muted-foreground">{artistLabel}</p> : null}
            {portfolio.price > 0 ? <CardPrice price={portfolio.price} discountRate={portfolio.discount_rate} /> : null}
        </div>
    );
}

function CardPrice({ price, discountRate }: Readonly<{ price: number; discountRate: number }>): React.ReactElement {
    return (
        <p className="mt-0.5 text-xs font-semibold text-purple-600">
            {price.toLocaleString()}원
            {discountRate > 0 ? <span className="ml-1 text-[10px] text-red-500">-{String(discountRate)}%</span> : null}
        </p>
    );
}
