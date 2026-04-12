// @client-reason: Interactive tab switching buttons
"use client";

import { Eye, Smile } from "lucide-react";
import type { MainTab, BrowSubTab, LipSubTab } from "./fitting-room-types";
import { INACTIVE_TAB } from "./fitting-room-types";

// ─── MainTabBar ─────────────────────────────────────────────────────────────

const MAIN_TABS: ReadonlyArray<{ value: MainTab; label: string; icon: typeof Eye }> = [
    { value: "brow", label: "눈썹", icon: Eye },
    { value: "lip", label: "입술", icon: Smile },
];

export function MainTabBar({ active, onChange }: Readonly<{
    active: MainTab;
    onChange: (tab: MainTab) => void;
}>): React.ReactElement {
    return (
        <div className="mb-2 flex gap-1.5 rounded-xl bg-white/5 p-1">
            {MAIN_TABS.map((tab) => {
                const isActive = active === tab.value;
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.value}
                        type="button"
                        aria-pressed={isActive}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            isActive
                                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                                : "text-white/60 hover:text-white focus-visible:text-white"
                        }`}
                        onClick={() => onChange(tab.value)}
                    >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

// ─── SubTabBar ──────────────────────────────────────────────────────────────

export const BROW_SUB_TABS: ReadonlyArray<{ value: BrowSubTab; label: string }> = [
    { value: "shape", label: "모양" },
    { value: "adjust", label: "조절" },
    { value: "color", label: "컬러" },
    { value: "exclude", label: "눈썹 제외" },
];

export const LIP_SUB_TABS: ReadonlyArray<{ value: LipSubTab; label: string }> = [
    { value: "color", label: "컬러" },
    { value: "saturation", label: "채도" },
    { value: "exclude", label: "입술 제외" },
];

export function SubTabBar<T extends string>({ tabs, active, onChange }: Readonly<{
    tabs: ReadonlyArray<{ value: T; label: string }>;
    active: T;
    onChange: (tab: T) => void;
}>): React.ReactElement {
    return (
        <div className="mb-2 flex gap-1.5">
            {tabs.map((tab) => {
                const isActive = active === tab.value;
                return (
                    <button
                        key={tab.value}
                        type="button"
                        aria-pressed={isActive}
                        className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            isActive ? "bg-pink-500 text-white" : INACTIVE_TAB
                        }`}
                        onClick={() => onChange(tab.value)}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
