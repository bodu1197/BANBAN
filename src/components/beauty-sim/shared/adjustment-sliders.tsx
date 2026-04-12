// @client-reason: Interactive slider controls for real-time eyebrow adjustment
"use client";

import { Slider } from "@/components/ui/slider";
import type { AdjustmentParams } from "@/lib/eyebrow-renderer";

// ─── Types ──────────────────────────────────────────────────────────────────

type BrowSide = "left" | "right" | "both";

interface SliderConfig {
    key: keyof AdjustmentParams;
    label: string;
    min: number;
    max: number;
    step: number;
    format: (v: number) => string;
}

// ─── Slider Configs (2×2 compact grid) ───────────────────────────────────

const SLIDERS: Readonly<SliderConfig[]> = [
    { key: "scaleY", label: "두께", min: 0.5, max: 1.5, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
    { key: "scaleX", label: "길이", min: 0.5, max: 1.5, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
    { key: "angleOffset", label: "각도", min: -0.3, max: 0.3, step: 0.02, format: (v) => `${Math.round(v * (180 / Math.PI))}°` },
    { key: "opacity", label: "진하기", min: 0.2, max: 1.0, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
];

// ─── Subcomponents ──────────────────────────────────────────────────────────

// PreView exact labels: 좌 / 우 / 좌/우
const SIDE_LABELS: Record<BrowSide, string> = { left: "좌", right: "우", both: "좌/우" };

function BrowSideToggle({ side, onSideChange }: Readonly<{
    side: BrowSide;
    onSideChange: (side: BrowSide) => void;
}>): React.ReactElement {
    return (
        <div className="flex gap-1 rounded-md bg-white/5 p-0.5">
            {(["left", "right", "both"] as const).map((s) => (
                <button
                    key={s}
                    type="button"
                    aria-pressed={side === s}
                    className={`flex-1 rounded px-2 py-1 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        side === s
                            ? "bg-white/20 text-white"
                            : "text-white/60 hover:text-white focus-visible:text-white"
                    }`}
                    onClick={() => onSideChange(s)}
                >
                    {/* eslint-disable-next-line security/detect-object-injection -- Safe: s is from a const tuple of known BrowSide literals */}
                    {SIDE_LABELS[s]}
                </button>
            ))}
        </div>
    );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AdjustmentSliders({ params, side, onParamsChange, onSideChange }: Readonly<{
    params: AdjustmentParams;
    side: BrowSide;
    onParamsChange: (params: AdjustmentParams) => void;
    onSideChange: (side: BrowSide) => void;
}>): React.ReactElement {
    const handleSliderChange = (key: keyof AdjustmentParams, values: number[]): void => {
        const value = values[0];
        if (value === undefined) return;
        onParamsChange({ ...params, [key]: value });
    };

    return (
        <div className="flex flex-col gap-2">
            <BrowSideToggle side={side} onSideChange={onSideChange} />

            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {SLIDERS.map((cfg) => (
                    <div key={cfg.key} className="flex items-center gap-1.5">
                        <span className="w-7 shrink-0 text-[10px] text-white/60">{cfg.label}</span>
                        <Slider
                            min={cfg.min}
                            max={cfg.max}
                            step={cfg.step}
                            value={[params[cfg.key]]}
                            onValueChange={(v) => handleSliderChange(cfg.key, v)}
                            aria-label={`${cfg.label} 조절`}
                            className="min-w-0 flex-1"
                        />
                        <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-white/60">
                            {cfg.format(params[cfg.key])}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
