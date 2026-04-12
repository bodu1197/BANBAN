// @client-reason: Interactive header buttons for fitting room navigation
"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";

export function FittingHeader({ vibeName, onBack, onReset }: Readonly<{
    vibeName: string;
    onBack: () => void;
    onReset: () => void;
}>): React.ReactElement {
    return (
        <header className="shrink-0 bg-gray-900/80 px-4 py-2 backdrop-blur-sm">
            <div className="mx-auto flex max-w-lg items-center justify-between">
                <button
                    type="button"
                    aria-label="뒤로 가기"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/20"
                    onClick={onBack}
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="font-medium text-white">{vibeName}</div>
                <button
                    type="button"
                    aria-label="초기화"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/20"
                    onClick={onReset}
                >
                    <RotateCcw className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
}
