// @client-reason: Modal state, search input, checkbox selection
"use client";

import { useState, useMemo, memo } from "react";
import { ArrowLeft } from "lucide-react";

interface GenreData {
  genre: { title: string; items: string[] };
  subject: { title: string; items: string[] };
  part: { title: string; items: string[] };
}

interface CheckboxSectionProps {
  title: string;
  items: string[];
  selectedItems: Set<string>;
  onToggle: (item: string) => void;
}

const CheckboxSection = memo(function CheckboxSection({ title, items, selectedItems, onToggle }: Readonly<CheckboxSectionProps>): React.ReactElement | null {
  if (items.length === 0) return null;

  return (
    <section>
      <h4 className="mb-3 text-sm font-bold text-foreground">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selectedItems.has(item)
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-border bg-background text-foreground hover:bg-muted focus-visible:bg-muted"
            }`}
            aria-pressed={selectedItems.has(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  );
});

interface GenreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selected: string[]) => void;
  selectedItems: string[];
  backLabel: string;
  searchPlaceholder: string;
  searchLabel: string;
  genreData: GenreData;
  clearLabel?: string;
  noResultsLabel?: string;
}

/* eslint-disable max-lines-per-function */
export function GenreModal({
  isOpen,
  onClose,
  onSelect,
  selectedItems,
  backLabel,
  searchPlaceholder,
  searchLabel,
  genreData,
  clearLabel = "Clear search",
  noResultsLabel = "No results found",
}: Readonly<GenreModalProps>): React.ReactElement | null {
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedItems));

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return genreData;

    const query = searchQuery.toLowerCase();
    return {
      genre: { ...genreData.genre, items: genreData.genre.items.filter((item) => item.toLowerCase().includes(query)) },
      subject: { ...genreData.subject, items: genreData.subject.items.filter((item) => item.toLowerCase().includes(query)) },
      part: { ...genreData.part, items: genreData.part.items.filter((item) => item.toLowerCase().includes(query)) },
    };
  }, [searchQuery, genreData]);

  if (!isOpen) return null;

  const handleToggle = (item: string): void => {
    const newSelected = new Set(localSelected);
    if (newSelected.has(item)) {
      newSelected.delete(item);
    } else {
      newSelected.add(item);
    }
    setLocalSelected(newSelected);
  };

  const handleSearch = (): void => {
    onSelect(Array.from(localSelected));
  };

  const hasResults = filteredData.genre.items.length > 0 || filteredData.subject.items.length > 0 || filteredData.part.items.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex justify-center bg-black/50">
      <div className="flex w-full max-w-[767px] flex-col bg-background">
      {/* Header with search */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={backLabel}
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border bg-background px-4 py-2 pr-10 text-sm placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={clearLabel}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Body - Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {hasResults ? (
          <div className="space-y-6">
            <CheckboxSection title={genreData.genre.title} items={filteredData.genre.items} selectedItems={localSelected} onToggle={handleToggle} />
            <CheckboxSection title={genreData.subject.title} items={filteredData.subject.items} selectedItems={localSelected} onToggle={handleToggle} />
            <CheckboxSection title={genreData.part.title} items={filteredData.part.items} selectedItems={localSelected} onToggle={handleToggle} />
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">{noResultsLabel}</p>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t bg-background p-4">
        <button
          type="button"
          onClick={handleSearch}
          className="w-full rounded-lg bg-brand-primary px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {searchLabel}
          {localSelected.size > 0 && ` (${localSelected.size})`}
        </button>
      </div>
      </div>
    </div>
  );
}
