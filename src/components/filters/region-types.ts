import type { Region } from "@/types/database";

export interface SidoGroup {
  sido: string;
  regions: Region[];
}

export interface RegionSelectorLabels {
  regionView: string;
  allRegions: string;
  resetAll: string;
  back: string;
  close: string;
  resetRegion: string;
  apply?: string;
}
