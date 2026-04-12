// @client-reason: Canvas overlay rendering for golden ratio guide lines
"use client";

import { useEffect, useRef } from "react";
import type { GoldenRatioResult } from "@/lib/golden-ratio";

// ─── Score Badge ────────────────────────────────────────────────────────────

function ScoreBadge({ score }: Readonly<{ score: number }>): React.ReactElement {
    const colorMap: Record<string, string> = {
        high: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900",
        mid: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900",
        low: "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900",
    };
    let tier = "low";
    if (score >= 80) tier = "high";
    else if (score >= 60) tier = "mid";
    // eslint-disable-next-line security/detect-object-injection -- Safe: tier is computed from known values
    const color = colorMap[tier] as string;

    return (
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${color}`}>
            <span className="text-xs font-medium">황금비율 점수</span>
            <span className="text-sm font-bold">{score}점</span>
        </div>
    );
}

// ─── Measurement Row ────────────────────────────────────────────────────────

function RatingBadge({ rating }: Readonly<{ rating: string }>): React.ReactElement {
    const ratingMap: Record<string, { label: string; cls: string }> = {
        excellent: { label: "우수", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
        good: { label: "양호", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
        fair: { label: "보통", cls: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
    };
    // eslint-disable-next-line security/detect-object-injection -- Safe: rating is a string literal from RatioMeasurement union type
    const r = ratingMap[rating] ?? ratingMap.fair;
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${r.cls}`}>{r.label}</span>;
}

// ─── Guide Lines Overlay ────────────────────────────────────────────────────

function GuideOverlay({ result, width, height }: Readonly<{
    result: GoldenRatioResult;
    width: number;
    height: number;
}>): React.ReactElement {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        for (const line of result.guideLines) {
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.lineTo(line.endX, line.endY);
            ctx.strokeStyle = line.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label
            const midX = (line.startX + line.endX) / 2;
            const midY = (line.startY + line.endY) / 2;
            ctx.font = "11px sans-serif";
            ctx.fillStyle = line.color;
            ctx.textAlign = "center";
            ctx.fillText(line.label, midX, midY - 6);
        }
    }, [result, width, height]);

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
        />
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function GoldenRuler({ result, canvasWidth, canvasHeight, showOverlay }: Readonly<{
    result: GoldenRatioResult;
    canvasWidth: number;
    canvasHeight: number;
    showOverlay: boolean;
}>): React.ReactElement {
    return (
        <div className="flex flex-col gap-3">
            {/* Overlay canvas (rendered on top of face canvas) */}
            {showOverlay ? (
                <GuideOverlay result={result} width={canvasWidth} height={canvasHeight} />
            ) : null}

            {/* Score + Measurements */}
            <div className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">스마트 룰러</p>
                    <ScoreBadge score={result.overallScore} />
                </div>

                <div className="flex flex-col gap-1.5">
                    {result.measurements.map((m) => (
                        <div key={m.label} className="flex items-center gap-2 text-xs">
                            <span className="w-24 shrink-0 text-muted-foreground">{m.label}</span>
                            <span className="font-mono tabular-nums">{m.actual}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="font-mono tabular-nums text-muted-foreground">{m.ideal}</span>
                            <span className="text-muted-foreground">({m.deviation}%)</span>
                            <RatingBadge rating={m.rating} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
