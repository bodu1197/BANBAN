// @client-reason: Interactive region selector with state
"use client";

import type { Region } from "@/types/database";
import { RegionSelector } from "@/components/filters";
import type { RegionSelectorLabels } from "@/components/filters/RegionSelector";

const KO_LABELS: RegionSelectorLabels = { regionView: "지역 선택", allRegions: "전체 지역", resetAll: "초기화", back: "뒤로", close: "닫기", resetRegion: "지역 초기화", apply: "적용" };

export default function BlogFilters({ regions, regionId, regionSido, onRegionChange }: Readonly<{
  regions: Region[];
  regionId: string | null;
  regionSido: string | null;
  onRegionChange: (id: string | null, sido: string | null) => void;
}>): React.ReactElement {
  const labels = KO_LABELS;

  return (
    <div className="px-4 pb-3">
      <RegionSelector
        regions={regions}
        selectedId={regionId}
        selectedSido={regionSido}
        labels={labels}
        onSelectRegions={onRegionChange}
      />
    </div>
  );
}
