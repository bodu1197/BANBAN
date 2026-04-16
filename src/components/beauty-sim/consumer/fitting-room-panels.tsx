// @client-reason: Interactive panels with sliders, color pickers, and toggle buttons
"use client";

import { ShapeSelector } from "@/components/beauty-sim/shared/shape-selector";
import { AdjustmentSliders } from "@/components/beauty-sim/shared/adjustment-sliders";
import { ColorPalette, BROW_COLORS, LIP_COLORS } from "@/components/beauty-sim/shared/color-palette";
import { Slider } from "@/components/ui/slider";
import type { AdjustmentParams } from "@/lib/eyebrow-renderer";
import type { EyebrowTemplate } from "@/lib/eyebrow-templates";
import type { LipParams } from "@/lib/lip-renderer";
import type { BrowSubTab, LipSubTab, BrowSide } from "./fitting-room-types";
import { INACTIVE_TAB } from "./fitting-room-types";

// ─── ExcludePanel ───────────────────────────────────────────────────────────

export function ExcludePanel({ excluded, onToggle, labelOn, labelOff, descOn, descOff }: Readonly<{
    excluded: boolean;
    onToggle: () => void;
    labelOn: string;
    labelOff: string;
    descOn: string;
    descOff: string;
}>): React.ReactElement {
    return (
        <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-white/60">{excluded ? descOn : descOff}</p>
            <button
                type="button"
                aria-pressed={excluded}
                className={`rounded-full px-6 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    excluded
                        ? "bg-pink-500 text-white hover:bg-pink-600 focus-visible:bg-pink-600"
                        : INACTIVE_TAB
                }`}
                onClick={onToggle}
            >
                {excluded ? labelOn : labelOff}
            </button>
        </div>
    );
}

// ─── LipSaturationPanel ─────────────────────────────────────────────────────

export function LipSaturationPanel({ lipParams, onLipParamsChange }: Readonly<{
    lipParams: LipParams;
    onLipParamsChange: (p: LipParams) => void;
}>): React.ReactElement {
    return (
        <div className="py-2">
            <div className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-xs text-white/60">연하게</span>
                <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[lipParams.saturation]}
                    onValueChange={(v) => {
                        const val = v[0];
                        if (val !== undefined) onLipParamsChange({ ...lipParams, saturation: val });
                    }}
                    aria-label="입술 채도 조절"
                    className="flex-1"
                />
                <span className="w-10 shrink-0 text-right text-xs text-white/60">진하게</span>
            </div>
            <p className="mt-1 text-center text-[10px] text-white/40">
                {lipParams.saturation < 50 ? "무색" : `${Math.round((lipParams.saturation - 50) * 2)}%`}
            </p>
        </div>
    );
}

// ─── BottomActions ──────────────────────────────────────────────────────────

export function BottomActions({ onSave }: Readonly<{ onSave: () => void }>): React.ReactElement {
    return (
        <div className="mt-1 flex gap-2">
            <button
                type="button"
                className="flex-1 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:opacity-90"
                onClick={onSave}
            >
                이 스타일로 완성하기
            </button>
        </div>
    );
}

// ─── BrowContent ────────────────────────────────────────────────────────────

export function BrowContent({ subTab, selectedId, onSelectTemplate, activeAdj, browSide, onAdjChange, onSideChange, browColor, onColorChange, browExcluded, onToggleExclude }: Readonly<{
    subTab: BrowSubTab;
    selectedId: string | null;
    onSelectTemplate: (t: EyebrowTemplate) => void;
    activeAdj: AdjustmentParams;
    browSide: BrowSide;
    onAdjChange: (p: AdjustmentParams) => void;
    onSideChange: (s: BrowSide) => void;
    browColor: string;
    onColorChange: (hex: string) => void;
    browExcluded: boolean;
    onToggleExclude: () => void;
}>): React.ReactElement {
    if (subTab === "shape") return <ShapeSelector selectedId={selectedId} onSelect={onSelectTemplate} />;
    if (subTab === "adjust") return <AdjustmentSliders params={activeAdj} side={browSide} onParamsChange={onAdjChange} onSideChange={onSideChange} />;
    if (subTab === "color") return <ColorPalette colors={BROW_COLORS} selected={browColor} onSelect={onColorChange} />;
    return <ExcludePanel excluded={browExcluded} onToggle={onToggleExclude} labelOn="눈썹 다시 보기" labelOff="눈썹 제외하기" descOn="눈썹이 제외되었습니다" descOff="눈썹을 제외하고 피부만 보여줍니다" />;
}

// ─── LipContent ─────────────────────────────────────────────────────────────

export function LipContent({ subTab, lipParams, onLipParamsChange, lipExcluded, onToggleExclude }: Readonly<{
    subTab: LipSubTab;
    lipParams: LipParams;
    onLipParamsChange: (p: LipParams) => void;
    lipExcluded: boolean;
    onToggleExclude: () => void;
}>): React.ReactElement {
    if (subTab === "color") return <ColorPalette colors={LIP_COLORS} selected={lipParams.color} onSelect={(hex) => onLipParamsChange({ ...lipParams, color: hex })} />;
    if (subTab === "saturation") return <LipSaturationPanel lipParams={lipParams} onLipParamsChange={onLipParamsChange} />;
    return <ExcludePanel excluded={lipExcluded} onToggle={onToggleExclude} labelOn="입술 다시 보기" labelOff="입술 제외하기" descOn="입술이 제외되었습니다" descOff="입술 컬러를 제외합니다" />;
}
