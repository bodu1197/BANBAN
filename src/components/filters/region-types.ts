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
  // 적용 버튼 문구는 페이지별로 두지 않는다 — 목록마다 달라지면 같은 조작에 다른 이름이 붙는다.
  // (실제로 /discount 만 "적용", 나머지는 "등록" 이었다.)
}
