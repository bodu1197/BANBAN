// @client-reason: useState for search toggle/input, useRouter for navigation
"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
interface HeaderSearchProps {
    placeholder: string;
}

function SearchPanel({ placeholder, open, onClose }: Readonly<HeaderSearchProps & { open: boolean; onClose: () => void }>): React.ReactElement {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSearch = (): void => {
    const value = inputRef.current?.value.trim();
    if (!value) return;
    router.push(`/search?q=${encodeURIComponent(value)}`);
    if (inputRef.current) inputRef.current.value = "";
    onClose();
  };

  return (
    <div
      className={`absolute left-0 top-full z-50 w-full overflow-hidden border-b border-border/50 bg-background transition-all duration-200 ease-out ${
        open ? "max-h-14 opacity-100" : "max-h-0 opacity-0 border-b-0"
      }`}
    >
      <div className="mx-auto flex max-w-[767px] items-center gap-2 px-4 py-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            id="header-search"
            name="search"
            type="text"
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
              if (e.key === "Escape") onClose();
            }}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label={placeholder}
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close search"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
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
        aria-label="Search"
        aria-expanded={open}
      >
        <Search className="h-5 w-5" />
      </button>
      <SearchPanel placeholder={placeholder} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
