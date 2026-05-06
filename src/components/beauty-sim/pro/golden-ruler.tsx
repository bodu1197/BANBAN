// @client-reason: Canvas overlay rendering for golden ratio guide lines
"use client";

import { useEffect, useRef } from "react";
import type { GoldenRatioResult, GoldenRatioComparison } from "@/lib/golden-ratio";

// ─── Score Badge ────────────────────────────────────────────────────────────

function ScoreBadge({ score, delta }: Readonly<{ score: number; delta?: number }>): React.ReactElement {
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
            {delta !== undefined && delta !== 0 ? (
                <span className={`text-xs font-bold ${delta > 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {delta > 0 ? `+${delta}` : delta}
                </span>
            ) : null}
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

        const short = Math.min(width, height);
        const lw = Math.max(2, Math.round(short / 300));

        for (const line of result.guideLines) {
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.lineTo(line.endX, line.endY);
            ctx.strokeStyle = line.color;
            ctx.lineWidth = lw;
            ctx.setLineDash([lw * 3, lw * 2]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }, [result, width, height]);

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
        />
    );
}

// ─── Comparison Panel ───────────────────────────────────────────────────────

function ComparisonPanel({ comparison }: Readonly<{ comparison: GoldenRatioComparison }>): React.ReactElement {
    const { original, adjusted, scoreDelta, improvements } = comparison;
    const hasChanges = scoreDelta !== 0 || improvements.length > 0;

    return (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">스마트 룰러</p>
                <ScoreBadge score={adjusted.overallScore} delta={hasChanges ? scoreDelta : undefined} />
            </div>

            <GuideLegend lines={adjusted.guideLines} />

            {hasChanges ? (
                <div className="flex items-center gap-2 rounded-md bg-violet-50 px-3 py-1.5 dark:bg-violet-950/30">
                    <span className="text-xs text-muted-foreground">원본</span>
                    <span className="text-sm font-bold text-muted-foreground">{original.overallScore}점</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-xs text-foreground">보정 후</span>
                    <span className="text-sm font-bold text-foreground">{adjusted.overallScore}점</span>
                    {scoreDelta > 0 ? (
                        <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                            ↑{scoreDelta}점 개선
                        </span>
                    ) : null}
                </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
                {adjusted.measurements.map((m, i) => {
                    const orig = original.measurements[i];
                    const improved = orig && orig.deviation > m.deviation;
                    const worsened = orig && orig.deviation < m.deviation;

                    return (
                        <div key={m.label} className="flex items-center gap-2 text-xs">
                            <span className="w-24 shrink-0 text-muted-foreground">{m.label}</span>
                            <span className="font-mono tabular-nums">{m.actual}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="font-mono tabular-nums text-muted-foreground">{m.ideal}</span>
                            <span className="text-muted-foreground">({m.deviation}%)</span>
                            <RatingBadge rating={m.rating} />
                            {improved ? (
                                <span className="text-[10px] font-bold text-emerald-500">↑</span>
                            ) : null}
                            {worsened ? (
                                <span className="text-[10px] font-bold text-red-500">↓</span>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Static Panel (no comparison) ───────────────────────────────────────────

const GUIDE_COLOR_CLASS: Record<string, string> = {
    "#f472b6": "bg-pink-400",
    "#60a5fa": "bg-blue-400",
    "#a78bfa": "bg-violet-400",
    "#34d399": "bg-emerald-400",
    "#fb923c": "bg-orange-400",
};

function GuideLegend({ lines }: Readonly<{ lines: GoldenRatioResult["guideLines"] }>): React.ReactElement {
    return (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
            {lines.map((l) => (
                <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className={`inline-block h-0.5 w-4 rounded ${GUIDE_COLOR_CLASS[l.color] ?? "bg-muted-foreground"}`} />
                    <span>{l.label}</span>
                </div>
            ))}
        </div>
    );
}

function StaticPanel({ result }: Readonly<{ result: GoldenRatioResult }>): React.ReactElement {
    return (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">스마트 룰러</p>
                <ScoreBadge score={result.overallScore} />
            </div>

            <GuideLegend lines={result.guideLines} />

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
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function GoldenRuler({ result, comparison, canvasWidth, canvasHeight, showOverlay }: Readonly<{
    result: GoldenRatioResult;
    comparison?: GoldenRatioComparison;
    canvasWidth: number;
    canvasHeight: number;
    showOverlay: boolean;
}>): React.ReactElement {
    if (showOverlay) {
        return <GuideOverlay result={comparison?.adjusted ?? result} width={canvasWidth} height={canvasHeight} />;
    }

    if (comparison) {
        return <ComparisonPanel comparison={comparison} />;
    }

    return <StaticPanel result={result} />;
}
