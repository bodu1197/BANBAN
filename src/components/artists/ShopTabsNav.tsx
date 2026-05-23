// @client-reason: activeTab 상태와 onTabClick 콜백 — 부모 클라이언트가 관리하지만 이 컴포넌트도 클라이언트
"use client";

import { cn } from "@/lib/utils";

export type ShopTabId = "events" | "portfolio" | "beforeAfter" | "reviews";

interface ShopTab {
  id: ShopTabId;
  label: string;
  count?: number;
}

interface ShopTabsNavProps {
  activeTab: ShopTabId;
  onTabClick: (tab: ShopTabId) => void;
  tabs: ReadonlyArray<ShopTab>;
  ariaLabel?: string;
  className?: string;
}

export function ShopTabsNav({
  activeTab,
  onTabClick,
  tabs,
  ariaLabel = "샵 메뉴",
  className,
}: Readonly<ShopTabsNavProps>): React.ReactElement {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + delta + tabs.length) % tabs.length;
    const next = tabs.at(nextIndex);
    if (next) onTabClick(next.id);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "sticky top-12 z-40 flex items-center gap-6 overflow-x-auto border-b bg-background/95 px-4 backdrop-blur scrollbar-hide supports-[backdrop-filter]:bg-background/85",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        const labelText = tab.count !== undefined
          ? `${tab.label} (${tab.count.toLocaleString()})`
          : tab.label;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabClick(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "relative min-h-11 shrink-0 py-3 text-sm transition-colors focus-visible:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isActive
                ? "font-bold text-foreground"
                : "text-muted-foreground hover:text-foreground focus-visible:text-foreground",
            )}
          >
            {labelText}
            {isActive ? (
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
