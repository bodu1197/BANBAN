// @client-reason: Interactive header buttons for fitting room navigation
"use client";

import { ArrowLeft, RotateCcw, Eraser, Loader2 } from "lucide-react";

function eraseLabel(loading: boolean, active: boolean): string {
    if (loading) return "지우는 중";
    return active ? "눈썹 지움" : "눈썹 지우기";
}

// eslint-disable-next-line max-lines-per-function -- Header with nav + AI eraser toggle
export function FittingHeader({ vibeName, onBack, onReset, onToggleErase, eraseActive, eraseLoading, eraseAvailable }: Readonly<{
    vibeName: string;
    onBack: () => void;
    onReset: () => void;
    onToggleErase?: () => void;
    eraseActive?: boolean;
    eraseLoading?: boolean;
    eraseAvailable?: boolean;
}>): React.ReactElement {
    return (
        <header className="shrink-0 bg-gray-900/80 px-4 py-2 backdrop-blur-sm">
            <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
                <button
                    type="button"
                    aria-label="뒤로 가기"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/20"
                    onClick={onBack}
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                    <span className="truncate font-medium text-white">{vibeName}</span>
                    {eraseAvailable && onToggleErase ? (
                        <button
                            type="button"
                            aria-label="AI로 원본 눈썹 지우기"
                            aria-pressed={eraseActive ?? false}
                            disabled={eraseLoading ?? false}
                            onClick={onToggleErase}
                            className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${
                                eraseActive
                                    ? "border-pink-400/50 bg-pink-500/20 text-pink-200 hover:bg-pink-500/30"
                                    : "border-white/20 bg-white/10 text-white/80 hover:bg-white/20"
                            }`}
                        >
                            {eraseLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                                <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            <span className="whitespace-nowrap">
                                {eraseLabel(eraseLoading ?? false, eraseActive ?? false)}
                            </span>
                        </button>
                    ) : null}
                </div>

                <button
                    type="button"
                    aria-label="초기화"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/20"
                    onClick={onReset}
                >
                    <RotateCcw className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
}
