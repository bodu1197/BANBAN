// @client-reason: useState for search toggle/input, keyboard navigation, debounced API calls
"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
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

function RecentSearchList({ recentSearches, onRecentSelect, onClearRecent }: Readonly<{
  recentSearches: string[];
  onRecentSelect: (q: string) => void;
  onClearRecent: () => void;
}>): React.ReactElement {
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

function SuggestList({ items, query, activeIndex, onSelect }: Readonly<{
  items: SuggestItem[];
  query: string;
  activeIndex: number;
  onSelect: (item: SuggestItem) => void;
}>): React.ReactElement {
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
    return <RecentSearchList recentSearches={recentSearches} onRecentSelect={onRecentSelect} onClearRecent={onClearRecent} />;
  }

  if (items.length === 0 || !query) return null;

  return <SuggestList items={items} query={query} activeIndex={activeIndex} onSelect={onSelect} />;
}

function ClearQueryButton({ onClick }: Readonly<{ onClick: () => void }>): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="검색어 지우기"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

function SearchInput({ inputRef, query, onInput, onKeyDown, placeholder, dropdownVisible }: Readonly<{
  inputRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  onInput: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder: string;
  dropdownVisible: boolean;
}>): React.ReactElement {
  return (
    <input
      ref={inputRef}
      id="header-search"
      name="search"
      type="text"
      value={query}
      onChange={(e) => onInput(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      autoComplete="off"
      role="combobox"
      aria-expanded={dropdownVisible}
      aria-autocomplete="list"
      aria-controls="search-suggest-list"
      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      aria-label={placeholder}
    />
  );
}

function SearchInputBar({ inputRef, query, onInput, onKeyDown, placeholder, dropdownVisible, onClearQuery, onClose }: Readonly<{
  inputRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  onInput: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder: string;
  dropdownVisible: boolean;
  onClearQuery: () => void;
  onClose: () => void;
}>): React.ReactElement {
  return (
    <div className="mx-auto flex max-w-[767px] items-center gap-2 px-4 py-2">
      <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <SearchInput inputRef={inputRef} query={query} onInput={onInput} onKeyDown={onKeyDown} placeholder={placeholder} dropdownVisible={dropdownVisible} />
        {query ? <ClearQueryButton onClick={onClearQuery} /> : null}
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
  );
}

function handleSearchKeyDown(
  e: React.KeyboardEvent,
  params: Readonly<{
    items: SuggestItem[];
    activeIndex: number;
    query: string;
    setActiveIndex: (fn: (prev: number) => number) => void;
    setItems: (items: SuggestItem[]) => void;
    setQuery: (q: string) => void;
    onSelect: (item: SuggestItem) => void;
    onSearch: (q: string) => void;
    onClose: () => void;
  }>,
): void {
  const totalItems = params.items.length;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    params.setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    params.setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (params.activeIndex >= 0 && params.activeIndex < totalItems) {
      const selected = params.items.at(params.activeIndex);
      if (selected) params.onSelect(selected);
    } else {
      params.onSearch(params.query);
    }
  } else if (e.key === "Escape") {
    if (params.items.length > 0 || params.query) {
      params.setItems([]);
      params.setQuery("");
    } else {
      params.onClose();
    }
  }
}

function useSearchSuggestions(): {
  items: SuggestItem[];
  activeIndex: number;
  setItems: (items: SuggestItem[]) => void;
  setActiveIndex: (fn: (prev: number) => number) => void;
  resetActiveIndex: () => void;
  fetchDebounced: (value: string, timerRef: React.RefObject<ReturnType<typeof setTimeout> | null>) => void;
} {
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

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

  const fetchDebounced = useCallback((value: string, timerRef: React.RefObject<ReturnType<typeof setTimeout> | null>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    (timerRef as React.MutableRefObject<ReturnType<typeof setTimeout> | null>).current = setTimeout(() => fetchSuggestions(value.trim()), DEBOUNCE_MS);
  }, [fetchSuggestions]);

  const resetActiveIndex = useCallback(() => setActiveIndex(-1), []);

  return { items, activeIndex, setItems, setActiveIndex, resetActiveIndex, fetchDebounced };
}

function useSearchNavigation(handleClose: () => void): {
  executeSearch: (q: string) => void;
  handleSelect: (item: SuggestItem) => void;
} {
  const router = useRouter();

  const executeSearch = useCallback((searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;
    saveRecentSearch(q);
    router.push(`/search?q=${encodeURIComponent(q)}`);
    handleClose();
  }, [router, handleClose]);

  const handleSelect = useCallback((item: SuggestItem) => {
    saveRecentSearch(item.title);
    const path = item.type === "artist" ? `/artists/${item.id}` : `/portfolios/${item.id}`;
    router.push(path);
    handleClose();
  }, [router, handleClose]);

  return { executeSearch, handleSelect };
}

function useSearchPanel(open: boolean, onClose: () => void): {
  inputRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  items: SuggestItem[];
  activeIndex: number;
  recentSearches: string[];
  handleInput: (value: string) => void;
  handleSelect: (item: SuggestItem) => void;
  handleClose: () => void;
  handleClearRecent: () => void;
  handleClearQuery: () => void;
  executeSearch: (q: string) => void;
  setActiveIndex: (fn: (prev: number) => number) => void;
  setItems: (items: SuggestItem[]) => void;
  setQuery: (q: string) => void;
} {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [recentVersion, setRecentVersion] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { items, activeIndex, setItems, setActiveIndex, resetActiveIndex, fetchDebounced } = useSearchSuggestions();

  const resetState = useCallback(() => { setQuery(""); setItems([]); resetActiveIndex(); }, [setItems, resetActiveIndex]);
  const handleClose = useCallback(() => { resetState(); onClose(); }, [resetState, onClose]);
  const { executeSearch, handleSelect } = useSearchNavigation(handleClose);

  const recentSearches = useMemo(() => {
    if (!open) return [];
    void recentVersion;
    return getRecentSearches();
  }, [open, recentVersion]);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const handleInput = useCallback((value: string) => {
    setQuery(value);
    resetActiveIndex();
    fetchDebounced(value, timerRef);
  }, [resetActiveIndex, fetchDebounced]);

  const handleClearRecent = useCallback((): void => {
    clearRecentSearches();
    setRecentVersion((v) => v + 1);
  }, []);

  const handleClearQuery = useCallback(() => { setQuery(""); setItems([]); inputRef.current?.focus(); }, [setItems]);

  return {
    inputRef, query, items, activeIndex, recentSearches,
    handleInput, handleSelect, handleClose, handleClearRecent, handleClearQuery,
    executeSearch, setActiveIndex, setItems, setQuery,
  };
}

function SearchPanel({ placeholder, open, onClose }: Readonly<HeaderSearchProps & { open: boolean; onClose: () => void }>): React.ReactElement {
  const {
    inputRef, query, items, activeIndex, recentSearches,
    handleInput, handleSelect, handleClose, handleClearRecent, handleClearQuery,
    executeSearch, setActiveIndex, setItems, setQuery,
  } = useSearchPanel(open, onClose);

  const showRecent = query.length === 0 && open;
  const dropdownVisible = items.length > 0 || (showRecent && recentSearches.length > 0);

  return (
    <div
      className={cn(
        "absolute left-0 top-full z-50 w-full overflow-visible border-b border-border/50 bg-background transition-all duration-200 ease-out",
        open ? "max-h-14 opacity-100" : "max-h-0 opacity-0 border-b-0",
      )}
    >
      <SearchInputBar
        inputRef={inputRef}
        query={query}
        onInput={handleInput}
        onKeyDown={(e) => handleSearchKeyDown(e, { items, activeIndex, query, setActiveIndex, setItems, setQuery, onSelect: handleSelect, onSearch: executeSearch, onClose: handleClose })}
        placeholder={placeholder}
        dropdownVisible={dropdownVisible}
        onClearQuery={handleClearQuery}
        onClose={handleClose}
      />
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
