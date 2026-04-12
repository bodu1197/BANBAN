// @client-reason: Interactive tab selection with onClick handlers
"use client";

type InsightTabValue = "SEMI_PERMANENT";

interface TabItem {
  value: InsightTabValue;
  label: string;
}

const TABS: TabItem[] = [
  { value: "SEMI_PERMANENT", label: "반영구" },
];

export type { InsightTabValue };

export default function InsightTypeTabs({ activeTab, onTabChange }: Readonly<{
  activeTab: InsightTabValue;
  onTabChange: (tab: InsightTabValue) => void;
}>): React.ReactElement {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3" role="tablist" aria-label="아티스트 유형 필터">
      {TABS.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors hover:bg-brand-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive
                ? "bg-brand-primary text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
