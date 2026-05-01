// @client-reason: useState for search toggle/input, keyboard navigation, debounced API calls
"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, User, Image as ImageIcon, Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestItem {
  id: string;
  title: string;
  type: "artist" | "portfolio";
  extra?: string;
}

interface HeaderSearchProps {
  placeholder: string;
}

const DEBOUNCE_MS = 300;
const RECENT_KEY = "banunni_recent_searches";
const MAX_RECENT = 5;

const MAX_CACHE = 100;
const suggestCache = new Map<string, SuggestItem[]>();

function setCacheEntry(key: string, value: SuggestItem[]): void {
  if (suggestCache.size >= MAX_CACHE) {
    const firstKey = suggestCache.keys().next().value as string;
    suggestCache.delete(firstKey);
  }
  suggestCache.set(key, value);
}

function getRecentSearches(): string[] {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch { return []; }
}

function saveRecentSearch(query: string): void {
  const recent = getRecentSearches().filter((s) => s !== query);
  recent.unshift(query);
  globalThis.localStorage?.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function clearRecentSearches(): void {
  globalThis.localStorage?.removeItem(RECENT_KEY);
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-brand-primary">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function SuggestDropdown({ items, query, activeIndex, onSelect, recentSearches, onRecentSelect, onClearRecent, showRecent }: Readonly<{
  items: SuggestItem[];
  query: string;
  activeIndex: number;
  onSelect: (item: SuggestItem) => void;
  recentSearches: string[];
  onRecentSelect: (q: string) => void;
  onClearRecent: () => void;
  showRecent: boolean;
}>): React.ReactElement | null {
  if (showRecent && recentSearches.length > 0) {
    return (
      <div className="absolute left-0 top-full z-50 w-full border-b border-border bg-background shadow-lg">
        <div className="mx-auto max-w-[767px] px-4 py-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">최근 검색어</span>
            <button
              type="button"
              onClick={onClearRecent}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="최근 검색어 삭제"
            >
              <Trash2 className="h-3 w-3" />
              전체 삭제
            </button>
          </div>
          {recentSearches.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onRecentSelect(s)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0 || !query) return null;

  return (
    <div className="absolute left-0 top-full z-50 w-full border-b border-border bg-background shadow-lg">
      <ul role="listbox" className="mx-auto max-w-[767px] px-4 py-2">
        {items.map((item, i) => (
          <li key={`${item.type}-${item.id}`} role="option" aria-selected={i === activeIndex}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
                "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === activeIndex && "bg-muted",
              )}
            >
              {item.type === "artist" ? (
                <User className="h-4 w-4 shrink-0 text-brand-primary" />
              ) : (
                <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate">{highlightMatch(item.title, query)}</p>
                {item.extra ? (
                  <p className="truncate text-xs text-muted-foreground">{item.extra}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {item.type === "artist" ? "아티스트" : "포트폴리오"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SearchPanel({ placeholder, open, onClose }: Readonly<HeaderSearchProps & { open: boolean; onClose: () => void }>): React.ReactElement {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setRecentSearches(getRecentSearches());
    } else {
      setQuery("");
      setItems([]);
      setActiveIndex(-1);
    }
  }, [open]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 1) { setItems([]); return; }

    const cached = suggestCache.get(q);
    if (cached) { setItems(cached); return; }

    try {
      const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
      const data = await res.json() as { items: SuggestItem[] };
      setCacheEntry(q, data.items);
      setItems(data.items);
    } catch { setItems([]); }
  }, []);

  const handleInput = useCallback((value: string) => {
    setQuery(value);
    setActiveIndex(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(value.trim()), DEBOUNCE_MS);
  }, [fetchSuggestions]);

  const executeSearch = useCallback((searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;
    saveRecentSearch(q);
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setQuery("");
    setItems([]);
    onClose();
  }, [router, onClose]);

  const handleSelect = useCallback((item: SuggestItem) => {
    saveRecentSearch(item.title);
    const path = item.type === "artist" ? `/artists/${item.id}` : `/portfolios/${item.id}`;
    router.push(path);
    setQuery("");
    setItems([]);
    onClose();
  }, [router, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    const totalItems = items.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < totalItems) {
        handleSelect(items[activeIndex] as SuggestItem);
      } else {
        executeSearch(query);
      }
    } else if (e.key === "Escape") {
      if (items.length > 0 || query) {
        setItems([]);
        setQuery("");
      } else {
        onClose();
      }
    }
  };

  const handleClearRecent = (): void => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const showRecent = query.length === 0 && open;
  const dropdownVisible = items.length > 0 || (showRecent && recentSearches.length > 0);

  return (
    <div
      className={cn(
        "absolute left-0 top-full z-50 w-full overflow-visible border-b border-border/50 bg-background transition-all duration-200 ease-out",
        open ? "max-h-14 opacity-100" : "max-h-0 opacity-0 border-b-0",
      )}
    >
      <div className="mx-auto flex max-w-[767px] items-center gap-2 px-4 py-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            id="header-search"
            name="search"
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={dropdownVisible}
            aria-autocomplete="list"
            aria-controls="search-suggest-list"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label={placeholder}
          />
          {query ? (
            <button
              type="button"
              onClick={() => { setQuery(""); setItems([]); inputRef.current?.focus(); }}
              className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="검색어 지우기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="검색 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <SuggestDropdown
        items={items}
        query={query}
        activeIndex={activeIndex}
        onSelect={handleSelect}
        recentSearches={recentSearches}
        onRecentSelect={(s) => { setQuery(s); handleInput(s); }}
        onClearRecent={handleClearRecent}
        showRecent={showRecent}
      />
    </div>
  );
}

export function HeaderSearchIcon({ placeholder }: Readonly<HeaderSearchProps>): React.ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="검색"
        aria-expanded={open}
      >
        <Search className="h-5 w-5" />
      </button>
      <SearchPanel placeholder={placeholder} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
