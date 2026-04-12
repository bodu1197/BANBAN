// @client-reason: Interactive tab selection with onClick handlers
"use client";

type TabValue = "ALL" | "TATTOO" | "MALE_SEMI" | "FEMALE_SEMI";

interface TabItem {
  value: TabValue;
  label: string;
}

const TABS: TabItem[] = [
  { value: "ALL", label: "전체" },
  { value: "TATTOO", label: "타투" },
  { value: "MALE_SEMI", label: "남자반영구" },
  { value: "FEMALE_SEMI", label: "여자반영구" },
];

export type { TabValue };

export default function BlogTypeTabs({ activeTab, onTabChange }: Readonly<{
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
}>): React.ReactElement {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3" role="tablist" aria-label="블로그 유형 필터">
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
