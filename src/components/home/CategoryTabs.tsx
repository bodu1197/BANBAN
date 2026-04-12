// @client-reason: Tab selection state management for category filtering
"use client";

import { useState } from "react";
import type { Category } from "@/types/database";

interface CategoryTabsProps {
  categories: Readonly<Category[]>;
  onSelect?: (categoryId: string | null) => void;
  allLabel?: string;
}

export function CategoryTabs({
  categories,
  onSelect,
  allLabel = "All",
}: Readonly<CategoryTabsProps>): React.ReactElement {
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(id: string | null): void {
    setSelected(id);
    onSelect?.(id);
  }

  const baseClass =
    "shrink-0 rounded-full px-4 py-2 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const activeClass =
    "border border-brand-primary bg-background text-brand-primary font-semibold";
  const inactiveClass =
    "bg-muted text-muted-foreground hover:text-foreground focus-visible:text-foreground";

  return (
    <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap px-4 pb-4 scrollbar-hide">
      <button
        type="button"
        onClick={() => handleSelect(null)}
        className={`${baseClass} ${selected === null ? activeClass : inactiveClass}`}
        aria-pressed={selected === null}
      >
        {allLabel}
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => handleSelect(cat.id)}
          className={`${baseClass} ${selected === cat.id ? activeClass : inactiveClass}`}
          aria-pressed={selected === cat.id}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
