// @client-reason: Interactive color selection buttons with dynamic background colors
"use client";

import { Check } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ColorOption {
    hex: string;
    label: string;
}

// ─── Eyebrow Colors (17) ────────────────────────────────────────────────────

export const BROW_COLORS: ReadonlyArray<ColorOption> = [
    { hex: "#1a1a1a", label: "블랙" },
    { hex: "#2d2926", label: "소프트블랙" },
    { hex: "#3c2415", label: "에스프레소" },
    { hex: "#4a3020", label: "다크브라운" },
    { hex: "#5c3a2a", label: "초콜릿" },
    { hex: "#6b4530", label: "모카" },
    { hex: "#7a5035", label: "브라운" },
    { hex: "#8a6040", label: "웜브라운" },
    { hex: "#9a7050", label: "라이트브라운" },
    { hex: "#a88050", label: "골든브라운" },
    { hex: "#b89060", label: "허니브라운" },
    { hex: "#c8a070", label: "토프" },
    { hex: "#706058", label: "애쉬브라운" },
    { hex: "#686060", label: "그레이브라운" },
    { hex: "#787878", label: "쿨그레이" },
    { hex: "#6a6040", label: "올리브브라운" },
    { hex: "#7a7050", label: "카키브라운" },
];

// ─── Lip Colors (20) ────────────────────────────────────────────────────────

export const LIP_COLORS: ReadonlyArray<ColorOption> = [
    { hex: "#cc3333", label: "클래식레드" },
    { hex: "#b8242a", label: "체리레드" },
    { hex: "#8b2252", label: "와인레드" },
    { hex: "#991133", label: "딥레드" },
    { hex: "#ff4488", label: "핫핑크" },
    { hex: "#e87090", label: "로즈핑크" },
    { hex: "#f5a0b0", label: "베이비핑크" },
    { hex: "#c87898", label: "모브핑크" },
    { hex: "#e87060", label: "코랄" },
    { hex: "#f0a080", label: "피치" },
    { hex: "#e89080", label: "살몬" },
    { hex: "#e87040", label: "오렌지" },
    { hex: "#c89888", label: "누드" },
    { hex: "#d0a098", label: "누드핑크" },
    { hex: "#c8a890", label: "베이지" },
    { hex: "#b08060", label: "카라멜" },
    { hex: "#802040", label: "버건디" },
    { hex: "#903050", label: "플럼" },
    { hex: "#a03060", label: "베리" },
    { hex: "#a04030", label: "브릭" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function ColorPalette({ colors, selected, onSelect }: Readonly<{
    colors: ReadonlyArray<ColorOption>;
    selected: string;
    onSelect: (hex: string) => void;
}>): React.ReactElement {
    return (
        <div className="flex gap-2 overflow-x-auto pb-2">
            {colors.map((c) => {
                const isSelected = selected === c.hex;
                return (
                    <button
                        key={c.hex}
                        type="button"
                        aria-label={`${c.label} 색상`}
                        aria-pressed={isSelected}
                        className="flex shrink-0 flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-md"
                        onClick={() => onSelect(c.hex)}
                    >
                        <span
                            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform ${
                                isSelected
                                    ? "scale-110 ring-2 ring-pink-400 ring-offset-1 ring-offset-gray-900"
                                    : "hover:scale-110 focus-visible:scale-110"
                            }`}
                            // Dynamic color — Tailwind classes cannot represent arbitrary hex values
                            style={{ backgroundColor: c.hex }}
                        >
                            {isSelected ? (
                                <Check className="h-4 w-4 text-white drop-shadow-md" />
                            ) : null}
                        </span>
                        <span className="w-12 truncate text-center text-[10px] leading-tight text-white/60">
                            {c.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
