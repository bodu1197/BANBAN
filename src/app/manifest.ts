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
    // PWA install prompt 활성화를 위한 192/512 정사각형 아이콘 + Android adaptive 용 maskable 변형.
    // ban_logo.png (251x68 가로 로고) 를 정사각형 흰 캔버스에 중앙 배치하여 생성됨.
    icons: [
      { src: "/icon.png",                sizes: "32x32",   type: "image/png" },
      { src: "/apple-icon.png",          sizes: "180x180", type: "image/png" },
      { src: "/icon-192.png",            sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png",            sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png",   sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["beauty", "lifestyle", "shopping"],
  };
}
