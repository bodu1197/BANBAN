// @client-reason: Interactive template selection with category tabs and horizontal scrolling
"use client";

import { useState } from "react";
import Image from "next/image";
import { CATEGORIES, getTemplatesByCategory } from "@/lib/eyebrow-templates";
import type { BrowCategory, EyebrowTemplate } from "@/lib/eyebrow-templates";

// ─── Category Tabs ──────────────────────────────────────────────────────────

function CategoryTabs({ active, onChange }: Readonly<{
    active: BrowCategory;
    onChange: (cat: BrowCategory) => void;
}>): React.ReactElement {
    return (
        <div className="mb-3 flex gap-1.5">
            {CATEGORIES.map((cat) => {
                const isActive = active === cat.value;
                return (
                    <button
                        key={cat.value}
                        type="button"
                        aria-pressed={isActive}
                        className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            isActive
                                ? "border-purple-500 text-purple-400"
                                : "border-white/20 text-white/60 hover:border-white/40 focus-visible:border-white/40"
                        }`}
                        onClick={() => onChange(cat.value)}
                    >
                        {cat.label}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ShapeSelector({ selectedId, onSelect }: Readonly<{
    selectedId: string | null;
    onSelect: (template: EyebrowTemplate) => void;
}>): React.ReactElement {
    const [activeCategory, setActiveCategory] = useState<BrowCategory>("hairstroke");
    const templates = getTemplatesByCategory(activeCategory);

    return (
        <div>
            <CategoryTabs active={activeCategory} onChange={setActiveCategory} />
            <div className="flex select-none gap-2 overflow-x-auto pb-2">
                {templates.map((t) => {
                    const isActive = selectedId === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            aria-label={`${t.label} 눈썹 모양`}
                            aria-pressed={isActive}
                            className={`shrink-0 rounded-lg border-2 p-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isActive
                                    ? "border-pink-500 bg-pink-500/20"
                                    : "border-transparent bg-white/5 hover:bg-white/10 focus-visible:bg-white/10"
                            }`}
                            onClick={() => onSelect(t)}
                        >
                            <Image
                                src={t.imageUrl}
                                alt={t.label}
                                width={80}
                                height={40}
                                unoptimized
                                className={`h-10 w-20 object-contain ${isActive ? "opacity-100" : "opacity-60"}`}
                            />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
