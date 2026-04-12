// @client-reason: Modal state, region selection interaction
"use client";

import { useState, useMemo } from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { REGION_PREFIXES } from "@/lib/regions";

interface RegionItem {
  id: string;
  name: string;
}

interface RegionSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (region: RegionItem) => void;
  selectedId?: string;
  regions: ReadonlyArray<RegionItem>;
  title?: string;
  closeLabel?: string;
  emptyLabel?: string;
}

export function RegionSelector({
  isOpen,
  onClose,
  onSelect,
  selectedId,
  regions,
  title = "Select Region",
  closeLabel = "Close",
  emptyLabel = "No regions available",
}: Readonly<RegionSelectorProps>): React.ReactElement | null {
  const [activePrefix, setActivePrefix] = useState<string>(REGION_PREFIXES[0].prefix);

  const activeRegions = useMemo(
    () => regions.filter((r) => r.name.startsWith(activePrefix)),
    [regions, activePrefix],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-lg animate-in slide-in-from-bottom duration-300 rounded-t-2xl bg-background sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={closeLabel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-80 sm:h-96">
          {/* Left: Region prefixes */}
          <div className="w-24 shrink-0 overflow-y-auto border-r bg-muted/50">
            {REGION_PREFIXES.map(({ prefix, name }) => (
              <button
                key={prefix}
                type="button"
                onClick={() => setActivePrefix(prefix)}
                className={cn(
                  "w-full px-3 py-3 text-left text-sm transition-colors",
                  activePrefix === prefix
                    ? "bg-brand-primary text-white"
                    : "hover:bg-muted focus-visible:bg-muted",
                )}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Right: Sub-regions */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-2">
              {activeRegions.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => {
                    onSelect(region);
                    onClose();
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    selectedId === region.id
                      ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                      : "border-border hover:bg-muted focus-visible:bg-muted",
                  )}
                >
                  <span>{region.name.replace(`${activePrefix} `, "")}</span>
                  {selectedId === region.id && (
                    <Check className="h-4 w-4 text-brand-primary" />
                  )}
                </button>
              ))}
              {activeRegions.length === 0 && (
                <p className="col-span-2 py-8 text-center text-sm text-muted-foreground">
                  {emptyLabel}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
