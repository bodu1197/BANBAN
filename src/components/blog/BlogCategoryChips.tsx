// @client-reason: Interactive chip selection with onClick handlers
"use client";

import type { BlogCategoryCount } from "@/lib/supabase/blog-queries";

export default function BlogCategoryChips({ categories, selected, onSelect }: Readonly<{
  categories: BlogCategoryCount[];
  selected: string | null;
  onSelect: (name: string | null) => void;
}>): React.ReactElement | null {
  if (categories.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2" role="listbox" aria-label="카테고리 필터">
      <button
        role="option"
        aria-selected={selected === null}
        onClick={() => onSelect(null)}
        className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          selected === null ? "border-brand-primary text-brand-primary" : "border-border text-muted-foreground"
        }`}
      >
        전체
      </button>
      {categories.map((cat) => {
        const isActive = selected === cat.category_name;
        return (
          <button
            key={cat.category_name}
            role="option"
            aria-selected={isActive}
            onClick={() => onSelect(isActive ? null : cat.category_name)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive ? "border-brand-primary text-brand-primary" : "border-border text-muted-foreground"
            }`}
          >
            {cat.category_name}
            <span className="ml-1 text-muted-foreground/60">{cat.count}</span>
          </button>
        );
      })}
    </div>
  );
}
