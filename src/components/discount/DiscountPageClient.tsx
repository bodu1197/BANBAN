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

type CategoryKey = "all" | "tattoo" | "semi";

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "tattoo", label: "타투" },
  { key: "semi", label: "반영구" },
];

const TAB = "flex-1 py-2.5 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const TAB_ACTIVE = "border-b-2 border-brand-primary text-brand-primary";
const TAB_INACTIVE = "text-muted-foreground hover:text-foreground";

const PRICE_MAX = 500000;
const PRICE_STEP = 10000;

function CategoryTabs({ value, onChange }: Readonly<{
  value: CategoryKey; onChange: (v: CategoryKey) => void;
}>): React.ReactElement {
  return (
    <div className="flex border-b border-border">
      {CATEGORIES.map((c) => (
        <button key={c.key} onClick={() => onChange(c.key)} className={`${TAB} ${value === c.key ? TAB_ACTIVE : TAB_INACTIVE}`}>
          {c.label}
        </button>
      ))}
    </div>
  );
}

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

function matchCategory(p: HomePortfolio, cat: CategoryKey): boolean {
  if (cat === "all") return true;
  const t = p.artistType ?? "TATTOO";
  if (cat === "tattoo") return t === "TATTOO";
  return t === "SEMI_PERMANENT";
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

// eslint-disable-next-line max-lines-per-function
export function DiscountPageClient({
  portfolios, regions,
}: Readonly<DiscountPageClientProps>): React.ReactElement {
  const noDataMessage = STRINGS.common.noData;
  const [category, setCategory] = useState<CategoryKey>("all");
  const [regionId, setRegionId] = useState<string | null>(null);
  const [regionSido, setRegionSido] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState(0);

  const regionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of regions) map.set(r.name, r.id);
    return map;
  }, [regions]);

  const activeRegions = useMemo(() => {
    const activeIds = new Set<string>();
    for (const p of portfolios) {
      if (p.artistRegion) {
        const id = regionMap.get(p.artistRegion);
        if (id) activeIds.add(id);
      }
    }
    return regions.filter((r) => activeIds.has(r.id));
  }, [portfolios, regions, regionMap]);

  const handleRegionChange = useCallback((id: string | null, sido: string | null): void => {
    setRegionId(id);
    setRegionSido(sido);
  }, []);

  const filtered = useMemo(() => {
    let items = portfolios.filter((p) => matchCategory(p, category));
    if (maxPrice > 0 && maxPrice < PRICE_MAX) items = items.filter((p) => p.price <= maxPrice);
    items = filterByRegion(items, regionId, regionSido, regionMap, activeRegions);
    return items;
  }, [portfolios, category, maxPrice, regionId, regionSido, regionMap, activeRegions]);

  return (
    <div className="py-4">
      <CategoryTabs value={category} onChange={setCategory} />

      <RegionSelector
        regions={activeRegions}
        selectedId={regionId}
        selectedSido={regionSido}
        labels={REGION_LABELS}
        onSelectRegions={handleRegionChange}
      />

      <PriceSlider maxPrice={maxPrice} onChange={setMaxPrice} />

      <p className="mb-4 px-4 text-sm text-muted-foreground">
        검색 결과 <span className="font-medium text-foreground">{filtered.length}</span>개
      </p>

      <div className="px-4">
        {filtered.length === 0 ? (
          <EmptyState message={noDataMessage} />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {filtered.map((p) => (
              <PortfolioGridCard key={p.id} portfolio={p} showDiscount />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
