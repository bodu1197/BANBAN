// @client-reason: Modal state, region grid selection interaction
"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { extractSido, getRegionDisplayName, getSidoDisplayName, REGION_PREFIXES } from "@/lib/regions";
import type { Region } from "@/types/database";
import type { SidoGroup, RegionSelectorLabels } from "./region-types";

export type { SidoGroup, RegionSelectorLabels } from "./region-types";

interface RegionSelectorProps {
  regions: Region[];
  selectedId: string | null;
  selectedSido: string | null;
  labels: RegionSelectorLabels;
  onSelectRegions: (id: string | null, sido: string | null) => void;
}

// --- Helpers ---

function groupBySido(regions: Region[]): SidoGroup[] {
  return REGION_PREFIXES
    .map(({ prefix }) => ({
      sido: prefix,
      regions: regions.filter((r) => extractSido(r.name) === prefix),
    }))
    .filter((g) => g.regions.length > 0);
}

function getSelectedName(selectedId: string | null, selectedSido: string | null, regions: Region[], allLabel: string): string {
  if (selectedSido) {
    return `${getSidoDisplayName(selectedSido)} ${allLabel}`;
  }
  if (!selectedId) return allLabel;
  const ids = selectedId.split(",").filter(Boolean);
  if (ids.length === 0) return allLabel;

  const firstRegion = regions.find((r) => r.id === ids[0]);
  if (!firstRegion) return allLabel;
  const firstRegionName = getRegionDisplayName(firstRegion);
  if (ids.length === 1) return firstRegionName;

  const extraCountLabel = `외 ${ids.length - 1}곳`;
  return `${firstRegionName} ${extraCountLabel}`;
}

import dynamic from "next/dynamic";

const RegionModal = dynamic(
  () => import("./RegionModal").then((mod) => mod.RegionModal),
  { ssr: false }
);

// --- Main component ---

export function RegionSelector({
  regions,
  selectedId,
  selectedSido,
  labels,
  onSelectRegions,
}: Readonly<RegionSelectorProps>): React.ReactElement {
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => groupBySido(regions), [regions]);
  const selectedName = getSelectedName(selectedId, selectedSido, regions, labels.allRegions);

  const handleSelectRegions = (id: string | null, sido: string | null): void => {
    onSelectRegions(id, sido);
  };

  return (
    <section className="px-4 py-3">
      <h2 className="mb-2 text-base font-bold">{labels.regionView}</h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex flex-1 items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selectedId ? "border-brand-primary" : "border-border hover:border-brand-primary",
          )}
        >
          <span className={selectedId ? "font-medium text-brand-primary" : "text-muted-foreground"}>
            {selectedName}
          </span>
          <span className="text-muted-foreground">&gt;</span>
        </button>
        {(selectedId || selectedSido) && (
          <button
            type="button"
            onClick={() => { onSelectRegions(null, null); }}
            aria-label={labels.resetRegion}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="text-base leading-none">&times;</span>
          </button>
        )}
      </div>
      {open && <RegionModal groups={groups} selectedId={selectedId} selectedSido={selectedSido} labels={labels} onSelectRegions={handleSelectRegions} onClose={() => setOpen(false)} />}
    </section>
  );
}
