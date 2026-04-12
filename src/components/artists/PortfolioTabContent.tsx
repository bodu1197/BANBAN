// @client-reason: View mode toggle state
"use client";

import { useState } from "react";
import { Grid3X3, List } from "lucide-react";
import type { PortfolioWithMedia } from "@/lib/supabase/queries";
import { PortfolioGallery } from "@/components/portfolio/PortfolioGallery";

/* eslint-disable max-lines-per-function */
interface PortfolioTabContentProps {
  portfolios: PortfolioWithMedia[];
  totalCountLabel: string;
  emptyMessage: string;
  gridViewLabel?: string;
  listViewLabel?: string;
}

export function PortfolioTabContent({
  portfolios,
  totalCountLabel,
  emptyMessage,
  gridViewLabel = "Grid view",
  listViewLabel = "List view",
}: Readonly<PortfolioTabContentProps>): React.ReactElement {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  return (
    <div>
      {/* Header with count and view toggle */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {totalCountLabel}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              viewMode === "grid"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"
            }`}
            aria-label={gridViewLabel}
            aria-pressed={viewMode === "grid"}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              viewMode === "list"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"
            }`}
            aria-label={listViewLabel}
            aria-pressed={viewMode === "list"}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Portfolio Grid/List */}
      {portfolios.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <PortfolioGallery portfolios={portfolios} />
      )}
    </div>
  );
}
