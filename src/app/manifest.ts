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
    icons: [
      { src: "/ban_logo.png", sizes: "any", type: "image/png", purpose: "any" },
    ],
    categories: ["beauty", "lifestyle", "shopping"],
  };
}
