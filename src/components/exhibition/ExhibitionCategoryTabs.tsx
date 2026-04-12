// @client-reason: Interactive category tab filtering with useState
"use client";

import { useState } from "react";
import type { ExhibitionItem } from "@/lib/supabase/exhibition-queries";
import { ExhibitionCard } from "./ExhibitionCard";

const CATEGORIES = [
    { value: "ALL", label: { ko: "전체" } },
    { value: "WOMENS_BEAUTY", label: { ko: "여자뷰티" } },
    { value: "MENS_BEAUTY", label: { ko: "남자뷰티" } },
] as const;

function getLabel(labels: Record<string, string>): string {
    return labels.ko;
}

export function ExhibitionCategoryTabs({ items}: Readonly<{
    items: ExhibitionItem[];
    }>): React.ReactElement {
    const [active, setActive] = useState("ALL");

    const filtered = active === "ALL" ? items : items.filter((i) => i.category === active);

    return (
        <>
            <div className="mb-5 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                    <button
                        key={c.value}
                        type="button"
                        onClick={() => setActive(c.value)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            active === c.value
                                ? "bg-brand-primary text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 focus-visible:bg-muted/80"
                        }`}
                    >
                        {getLabel(c.label)}
                    </button>
                ))}
            </div>
            <div className="space-y-4">
                {filtered.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground">
                        <p className="text-sm">등록된 기획전이 없습니다</p>
                    </div>
                ) : null}
                {filtered.map((item) => (
                    <ExhibitionCard key={item.id} item={item} />
                ))}
            </div>
        </>
    );
}
