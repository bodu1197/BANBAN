import type { Metadata } from "next";

export { default } from "@/components/shared/ArtistNotFound";

// 404 상태만으로도 구글은 색인하지 않지만, 혹시 모를 200 회귀에 대비한 이중 안전장치.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
