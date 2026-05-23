// @client-reason: useRouter for tab navigation to artist page
"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { STRINGS } from "@/lib/strings";
import { ShopTabsNav, type ShopTabId } from "./ShopTabsNav";

interface ShopNavTabsProps {
  artistId: string;
  eventCount: number;
  portfolioCount: number;
  beforeAfterCount: number;
  reviewCount: number;
  stickyTopClass?: string;
}

export function ShopNavTabs({
  artistId,
  eventCount,
  portfolioCount,
  beforeAfterCount,
  reviewCount,
  stickyTopClass,
}: Readonly<ShopNavTabsProps>): React.ReactElement {
  const router = useRouter();

  const handleTabClick = useCallback((tab: ShopTabId) => {
    const query = tab === "home" ? "" : `?tab=${tab}`;
    router.push(`/artists/${artistId}${query}`);
  }, [artistId, router]);

  const tabs: ReadonlyArray<{ id: ShopTabId; label: string; count?: number }> = [
    { id: "home", label: "홈" },
    { id: "events", label: STRINGS.artist.events, count: eventCount },
    { id: "portfolio", label: STRINGS.artist.portfolio, count: portfolioCount },
    { id: "beforeAfter", label: STRINGS.artist.beforeAfter, count: beforeAfterCount },
    { id: "reviews", label: STRINGS.artist.reviews, count: reviewCount },
  ];

  return (
    <ShopTabsNav
      activeTab={"home" as ShopTabId}
      onTabClick={handleTabClick}
      tabs={tabs}
      className={stickyTopClass}
    />
  );
}
