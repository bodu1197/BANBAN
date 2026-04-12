// @client-reason: Interactive filter controls with state management and user input
"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { FilterBadge } from "@/components/filters/FilterBadge";
import { RegionSelector } from "@/components/filters/RegionSelector";
import { cn } from "@/lib/utils";
import { getCategoryDisplayName } from "@/types/portfolio-search";
import type { Region } from "@/types/database";
import type { CategoryItem, CategoryType } from "@/types/portfolio-search";
import type { PortfolioFilters } from "@/hooks/usePortfolioFilters";
import type { STRINGS } from "@/lib/strings";

type PortfolioSearchStrings = typeof STRINGS["portfolioSearch"];

const ALL_TABS: CategoryType[] = ["GENRE", "SUBJECT", "PART", "SHOP"];
const PRICE_MAX = 500000;
const PRICE_STEP = 10000;
const TAB_BASE_CLASS = "text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const TAB_ACTIVE_CLASS = "border-b-2 border-brand-primary text-brand-primary";
const TAB_INACTIVE_CLASS = "text-muted-foreground hover:text-foreground";

function chipClass(active: boolean): string {
  return cn(
    "shrink-0 rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "border border-brand-primary bg-background text-brand-primary font-semibold"
      : "bg-muted text-muted-foreground hover:text-foreground focus-visible:text-foreground",
  );
}

// --- Category Tab Bar (장르 | 주제 | 부위) ---

function CategoryTabBar({ tabs, activeTab, onSelect, labels }: Readonly<{
  tabs: CategoryType[];
  activeTab: CategoryType;
  onSelect: (tab: CategoryType) => void;
  labels: Record<string, string>;
}>): React.ReactElement {
  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onSelect(tab)}
          aria-pressed={activeTab === tab}
          className={cn(
            "flex-1 py-3 text-center", TAB_BASE_CLASS,
            activeTab === tab ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS,
          )}
        >
          {Object.prototype.hasOwnProperty.call(labels, tab) ? labels[tab as keyof typeof labels] : tab}
        </button>
      ))}
    </div>
  );
}

// --- Category Chips (가로 스크롤 칩) ---

function CategoryChips({ categories, selectedIds, onToggle}: Readonly<{
  categories: CategoryItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  }>): React.ReactElement {
  if (categories.length === 0) return <div className="h-2" />;
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
      {categories.map((cat) => {
        const isSelected = selectedIds.includes(cat.id);
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onToggle(cat.id)}
            aria-pressed={isSelected}
            className={chipClass(isSelected)}
          >
            {getCategoryDisplayName(cat)}
          </button>
        );
      })}
    </div>
  );
}

// --- Beauty Category Tabs (hierarchical: parent tabs → child chips) ---

function BeautyCategoryTabBar({ parents, activeParentId, onSelect}: Readonly<{
  parents: CategoryItem[];
  activeParentId: string | null;
  onSelect: (id: string | null) => void;
  }>): React.ReactElement {
  return (
    <div className="flex border-b border-border overflow-x-auto scrollbar-hide">
      {parents.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.id)}
          aria-pressed={activeParentId === cat.id}
          className={cn("shrink-0 px-4 py-3 text-center whitespace-nowrap", TAB_BASE_CLASS, activeParentId === cat.id ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS)}
        >
          {getCategoryDisplayName(cat)}
        </button>
      ))}
    </div>
  );
}

function formatSliderPrice(v: number): string {
  if (v >= 10000) return `${Math.floor(v / 10000)}만원`;
  return `${v.toLocaleString()}원`;
}

function PriceSlider({ value, onCommit, labels }: Readonly<{
  value: number;
  onCommit: (v: number) => void;
  labels: { price: string; priceUnlimited: string; priceUnder: string };
}>): React.ReactElement {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (local === value) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onCommit(local), 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [local]); // eslint-disable-line react-hooks/exhaustive-deps -- debounce local only

  const label = local === 0 || local >= PRICE_MAX
    ? labels.priceUnlimited
    : `${formatSliderPrice(local)} ${labels.priceUnder}`;
  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{labels.price}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <input
        type="range"
        min={0}
        max={PRICE_MAX}
        step={PRICE_STEP}
        value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        className="w-full accent-brand-primary"
        aria-label={labels.price}
      />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{labels.priceUnlimited}</span>
        <span>{formatSliderPrice(PRICE_MAX)}</span>
      </div>
    </div>
  );
}

function ResetButton({ label, onClick }: Readonly<{ label: string; onClick: () => void }>): React.ReactElement {
  return (
    <div className="px-4 py-2">
      <button type="button" onClick={onClick} className="text-xs text-muted-foreground underline hover:text-foreground focus-visible:text-foreground focus-visible:outline-none">
        {label}
      </button>
    </div>
  );
}

// --- Selected Category Tags ---

function SelectedTags({ categories, selectedIds, onRemove}: Readonly<{
  categories: CategoryItem[];
  selectedIds: string[];
  onRemove: (id: string) => void;
  }>): React.ReactElement | null {
  if (selectedIds.length === 0) return null;
  const selectedCats = categories.filter((c) => selectedIds.includes(c.id));
  return (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      {selectedCats.map((cat) => (
        <FilterBadge key={cat.id} label={getCategoryDisplayName(cat)} onRemove={() => onRemove(cat.id)} />
      ))}
    </div>
  );
}

// --- Beauty Filter (hierarchical parent → child) ---

function BeautyFilterSection({ categories, filters, setCategoryIds}: Readonly<{
  categories: CategoryItem[];
  filters: PortfolioFilters;
  setCategoryIds: (ids: string[]) => void;
  }>): React.ReactElement {
  const parentCategories = useMemo(() => categories.filter((c) => c.type === "GENRE"), [categories]);
  const firstParentId = parentCategories[0]?.id ?? null;
  const [activeParentId, setActiveParentId] = useState<string | null>(
    filters.categoryIds.length > 0
      ? parentCategories.find((c) => filters.categoryIds.includes(c.id))?.id ?? firstParentId
      : firstParentId,
  );
  const childCategories = useMemo(
    () => activeParentId ? categories.filter((c) => c.type === "SKILL" && c.parentId === activeParentId) : [],
    [categories, activeParentId],
  );

  const handleParentSelect = useCallback((parentId: string | null): void => {
    setActiveParentId(parentId);
    setCategoryIds(parentId ? [parentId] : []);
  }, [setCategoryIds]);

  const handleChildToggle = useCallback((childId: string): void => {
    const isSelected = filters.categoryIds.includes(childId);
    if (isSelected) {
      setCategoryIds(filters.categoryIds.filter((cid) => cid !== childId));
    } else {
      const next = [...filters.categoryIds, childId];
      if (activeParentId && !next.includes(activeParentId)) next.push(activeParentId);
      setCategoryIds(next);
    }
  }, [filters.categoryIds, setCategoryIds, activeParentId]);

  return (
    <>
      <BeautyCategoryTabBar parents={parentCategories} activeParentId={activeParentId} onSelect={handleParentSelect} />
      {childCategories.length > 0 && (
        <CategoryChips categories={childCategories} selectedIds={filters.categoryIds} onToggle={handleChildToggle} />
      )}
    </>
  );
}

// --- Standard Filter (flat tabs → chips) ---

function StandardFilterSection({ categories, filters, setCategoryIds, labels }: Readonly<{
  categories: CategoryItem[];
  filters: PortfolioFilters;
  setCategoryIds: (ids: string[]) => void;
    labels: Record<string, string>;
}>): React.ReactElement {
  const availableTabs = useMemo(() => ALL_TABS.filter((t) => categories.some((c) => c.type === t)), [categories]);
  const [activeTab, setActiveTab] = useState<CategoryType>(availableTabs[0] ?? "GENRE");
  const filteredCategories = useMemo(() => categories.filter((c) => c.type === activeTab), [categories, activeTab]);

  const toggleCategory = useCallback((id: string): void => {
    setCategoryIds(
      filters.categoryIds.includes(id)
        ? filters.categoryIds.filter((cid) => cid !== id)
        : [...filters.categoryIds, id],
    );
  }, [filters.categoryIds, setCategoryIds]);

  return (
    <>
      <CategoryTabBar tabs={availableTabs} activeTab={activeTab} onSelect={setActiveTab} labels={labels} />
      <CategoryChips categories={filteredCategories} selectedIds={filters.categoryIds} onToggle={toggleCategory} />
    </>
  );
}

// --- Main Filter Controls ---

export function PortfolioFilterControls({ categories, regions, d, filters, setRegions, setCategoryIds, setPriceMax, resetFilters, hasActiveFilters, isBeautyPage }: Readonly<{
  categories: CategoryItem[];
  regions: Region[];
    d: PortfolioSearchStrings;
  filters: PortfolioFilters;
  setRegions: (regionId: string | null, sido: string | null) => void;
  setCategoryIds: (ids: string[]) => void;
  setPriceMax: (price: number) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  isBeautyPage: boolean;
}>): React.ReactElement {
  const removeCategory = useCallback((id: string): void => {
    setCategoryIds(filters.categoryIds.filter((cid) => cid !== id));
  }, [filters.categoryIds, setCategoryIds]);

  const priceLabels = { price: d.price, priceUnlimited: d.priceUnlimited, priceUnder: d.priceUnder };

  return (
    <>
      {isBeautyPage
        ? <BeautyFilterSection categories={categories} filters={filters} setCategoryIds={setCategoryIds} />
        : <StandardFilterSection categories={categories} filters={filters} setCategoryIds={setCategoryIds} labels={d.categoryTabs} />
      }
      <RegionSelector
        regions={regions}
        selectedId={filters.regionId}
        selectedSido={filters.regionSido}
        labels={d}
        onSelectRegions={setRegions}
      />
      <PriceSlider value={filters.priceMax} onCommit={setPriceMax} labels={priceLabels} />
      <SelectedTags categories={categories} selectedIds={filters.categoryIds} onRemove={removeCategory} />
      {hasActiveFilters && <ResetButton label={d.resetAll} onClick={resetFilters} />}
    </>
  );
}
