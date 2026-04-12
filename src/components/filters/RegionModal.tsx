// @client-reason: Modal state, region grid selection interaction
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getSubRegionDisplayName, getSidoDisplayName } from "@/lib/regions";
import type { RegionSelectorLabels, SidoGroup } from "./region-types";

function regionBtnClass(active: boolean): string {
  return cn(
    "rounded-lg px-3 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "bg-brand-primary text-white font-semibold"
      : "bg-muted text-muted-foreground hover:text-foreground focus-visible:text-foreground",
  );
}

function RegionModalHeader({ title, showBack, onBack, backLabel, showReset, resetLabel, onReset, onClose, closeLabel }: Readonly<{
  title: string; showBack: boolean; onBack: () => void; backLabel: string;
  showReset: boolean; resetLabel: string; onReset: () => void; onClose: () => void; closeLabel: string;
}>): React.ReactElement {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {showBack && (
          <button type="button" onClick={onBack} aria-label={backLabel} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="text-base leading-none">&lt;</span>
          </button>
        )}
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {showReset && (
          <button type="button" onClick={onReset} className="rounded-full px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {resetLabel}
          </button>
        )}
        <button type="button" onClick={onClose} aria-label={closeLabel} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="text-xl leading-none">&times;</span>
        </button>
      </div>
    </div>
  );
}

function RegionSubGrid({ group, localIds, localSido, allLabel, onSelectAll, onToggle }: Readonly<{
  group: SidoGroup; localIds: Set<string>; localSido: string | null; allLabel: string;
  onSelectAll: () => void; onToggle: (id: string) => void;
}>): React.ReactElement {
  const isAllSelected = localSido === group.sido;
  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
      <button type="button" onClick={onSelectAll} className={regionBtnClass(isAllSelected)}>
        {allLabel}
      </button>
      {group.regions.map((r) => (
        <button key={r.id} type="button" onClick={() => onToggle(r.id)} className={regionBtnClass(localIds.has(r.id) && !isAllSelected)}>
          {getSubRegionDisplayName(r)}
        </button>
      ))}
    </div>
  );
}

/* eslint-disable max-lines-per-function */
export function RegionModal({ groups, selectedId, selectedSido, labels, onSelectRegions, onClose }: Readonly<{
  groups: SidoGroup[]; selectedId: string | null; selectedSido: string | null; labels: RegionSelectorLabels;
  onSelectRegions: (id: string | null, sido: string | null) => void; onClose: () => void;
}>): React.ReactElement {
  const [activeSido, setActiveSido] = useState<string | null>(null);
  const activeGroup = activeSido ? groups.find((g) => g.sido === activeSido) : null;

  const [localIds, setLocalIds] = useState<Set<string>>(() => new Set(selectedId ? selectedId.split(",").filter(Boolean) : []));
  const [localSido, setLocalSido] = useState<string | null>(selectedSido);

  const handleToggleRegion = (id: string): void => {
    const next = new Set(localIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setLocalIds(next);
    setLocalSido(null);
  };

  const handleSelectSido = (sido: string): void => {
    setLocalSido(sido);
    setLocalIds(new Set());
  };

  const handleApply = (): void => {
    onSelectRegions(localIds.size > 0 ? Array.from(localIds).join(",") : null, localSido);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={labels.regionView}>
      <div className="fixed inset-0 bg-black/50" onClick={onClose} onKeyDown={() => { }} role="presentation" />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-[767px] flex-col overflow-hidden rounded-t-2xl bg-background sm:rounded-2xl">
        <div className="overflow-y-auto p-6">
          <RegionModalHeader
            title={activeGroup ? getSidoDisplayName(activeSido as string) : labels.regionView}
            showBack={!!activeGroup}
            onBack={() => setActiveSido(null)}
            backLabel={labels.back}
            showReset={localIds.size > 0 || !!localSido}
            resetLabel={labels.resetAll}
            onReset={() => { setLocalIds(new Set()); setLocalSido(null); }}
            onClose={onClose}
            closeLabel={labels.close}
          />
          {activeGroup ? (
            <RegionSubGrid
              group={activeGroup}
              localIds={localIds}
              localSido={localSido}
              allLabel={labels.allRegions}
              onSelectAll={() => handleSelectSido(activeGroup.sido)}
              onToggle={handleToggleRegion}
            />
          ) : (
            <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
              <button type="button" onClick={() => { setLocalIds(new Set()); setLocalSido(null); }} className={regionBtnClass(localIds.size === 0 && !localSido)}>
                {labels.allRegions}
              </button>
              {groups.map((g) => {
                const isActive = localSido === g.sido || g.regions.some((r) => localIds.has(r.id));
                return (
                  <button key={g.sido} type="button" onClick={() => setActiveSido(g.sido)} className={regionBtnClass(isActive)}>
                    {getSidoDisplayName(g.sido)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-border p-4 pb-20 shadow-sm sm:pb-4">
          <button
            type="button"
            onClick={handleApply}
            className="w-full rounded-xl bg-brand-primary px-4 py-3.5 text-center font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {labels.apply ?? "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
