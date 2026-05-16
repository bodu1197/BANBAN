import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "반언니 - 반영구 화장 가격비교 & 아티스트 추천",
    short_name: "반언니",
    description: "전국 반영구 아티스트 포트폴리오·가격비교 플랫폼",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "ko-KR",
    // ban_logo.png 는 251x68 가로 로고라 PWA 아이콘 부적합.
    // 정사각형 favicon 자산을 사용 (정확한 크기 명시 — Chrome "Resource size is not correct" 경고 방지).
    // 향후 192x192 / 512x512 정사각형 아이콘 추가 시 PWA install prompt 활성화됨.
    icons: [
      { src: "/icon.png",       sizes: "32x32",   type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    categories: ["beauty", "lifestyle", "shopping"],
  };
}
