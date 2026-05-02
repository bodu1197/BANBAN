// @client-reason: client-side filtering with tabs, region modal, and price slider
"use client";

import { useState, useMemo, useCallback } from "react";
import { STRINGS } from "@/lib/strings";
import type { HomePortfolio } from "@/lib/supabase/home-queries";
import type { Region } from "@/types/database";
import { RegionSelector } from "@/components/filters/RegionSelector";
import { PortfolioGridCard } from "@/components/shared/PortfolioGridCard";
import { EmptyState } from "@/components/shared/EmptyState";

interface DiscountPageClientProps {
  portfolios: HomePortfolio[];
  regions: Region[];
}

const PRICE_MAX = 500000;
const PRICE_STEP = 10000;

function formatPrice(v: number): string {
  if (v >= 10000) return `${Math.floor(v / 10000)}만원`;
  return `${v.toLocaleString()}원`;
}

function PriceSlider({ maxPrice, onChange }: Readonly<{
  maxPrice: number; onChange: (v: number) => void;
}>): React.ReactElement {
  const label = maxPrice === 0 || maxPrice >= PRICE_MAX ? "가격 무제한" : `${formatPrice(maxPrice)} 이하`;
  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">가격</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <input
        type="range"
        min={0}
        max={PRICE_MAX}
        step={PRICE_STEP}
        value={maxPrice}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-primary"
        aria-label="최대 가격"
      />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>무제한</span>
        <span>50만원</span>
      </div>
    </div>
  );
}

function matchCategory(p: HomePortfolio): boolean {
  const t = p.artistType ?? "TATTOO";
  return t === "SEMI_PERMANENT" || t === "BOTH";
}

const REGION_LABELS = {
  regionView: "지역별 보기",
  allRegions: "전체 지역",
  resetAll: "초기화",
  back: "뒤로",
  close: "닫기",
  resetRegion: "지역 초기화",
  apply: "적용",
};

function filterByRegion(items: HomePortfolio[], regionId: string | null, regionSido: string | null, regionMap: Map<string, string>, activeRegions: Region[]): HomePortfolio[] {
  if (regionId) {
    const selectedIds = new Set(regionId.split(",").filter(Boolean));
    return items.filter((p) => {
      if (!p.artistRegion) return false;
      const id = regionMap.get(p.artistRegion);
      return id ? selectedIds.has(id) : false;
    });
  }
  if (regionSido) {
    const sidoIds = new Set(activeRegions.filter((r) => r.name.startsWith(regionSido)).map((r) => r.id));
    return items.filter((p) => {
      if (!p.artistRegion) return false;
      const id = regionMap.get(p.artistRegion);
      return id ? sidoIds.has(id) : false;
    });
  }
  return items;
}

function buildRegionMap(regions: Region[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of regions) map.set(r.name, r.id);
  return map;
}

function findActiveRegions(portfolios: HomePortfolio[], regions: Region[], regionMap: Map<string, string>): Region[] {
  const activeIds = new Set<string>();
  for (const p of portfolios) {
    if (p.artistRegion) {
      const id = regionMap.get(p.artistRegion);
      if (id) activeIds.add(id);
    }
  }
  return regions.filter((r) => activeIds.has(r.id));
}

function DiscountResults({ items }: Readonly<{ items: HomePortfolio[] }>): React.ReactElement {
  if (items.length === 0) return <EmptyState message={STRINGS.common.noData} />;
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {items.map((p) => (
        <PortfolioGridCard key={p.id} portfolio={p} showDiscount />
      ))}
    </div>
  );
}

export function DiscountPageClient({
  portfolios, regions,
}: Readonly<DiscountPageClientProps>): React.ReactElement {
  const [regionId, setRegionId] = useState<string | null>(null);
  const [regionSido, setRegionSido] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState(0);

  const regionMap = useMemo(() => buildRegionMap(regions), [regions]);
  const activeRegions = useMemo(() => findActiveRegions(portfolios, regions, regionMap), [portfolios, regions, regionMap]);

  const handleRegionChange = useCallback((id: string | null, sido: string | null): void => {
    setRegionId(id);
    setRegionSido(sido);
  }, []);

  const filtered = useMemo(() => {
    let items = portfolios.filter((p) => matchCategory(p));
    if (maxPrice > 0 && maxPrice < PRICE_MAX) items = items.filter((p) => p.price <= maxPrice);
    return filterByRegion(items, regionId, regionSido, regionMap, activeRegions);
  }, [portfolios, maxPrice, regionId, regionSido, regionMap, activeRegions]);

  return (
    <div className="py-4">
      <RegionSelector regions={activeRegions} selectedId={regionId} selectedSido={regionSido}
        labels={REGION_LABELS} onSelectRegions={handleRegionChange} />
      <PriceSlider maxPrice={maxPrice} onChange={setMaxPrice} />
      <p className="mb-4 px-4 text-sm text-muted-foreground">
        검색 결과 <span className="font-medium text-foreground">{filtered.length}</span>개
      </p>
      <div className="px-4">
        <DiscountResults items={filtered} />
      </div>
    </div>
  );
}
