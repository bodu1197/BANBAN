import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// 공개 준비 중에는 NEXT_PUBLIC_BLOCK_INDEXING=true 로 전체 차단 유지.
// 공개 시점에 Vercel env 에서 해당 변수 제거(또는 false) → 기본 허용 규칙으로 전환.
const BLOCK_INDEXING = process.env.NEXT_PUBLIC_BLOCK_INDEXING === "true";

export default function robots(): MetadataRoute.Robots {
  if (BLOCK_INDEXING) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: ["/"],
        },
      ],
    };
  }

  // 비공개 경로 — 모든 봇 공통 차단
  const disallow = ["/admin", "/admin/*", "/api", "/api/*", "/mypage", "/mypage/*", "/reset-password"];
  // AI 답변/생성 엔진 + 한국 검색 봇 명시 허용 (AEO/GEO) — 차단 시 해당 엔진에서 영구 미인용.
  const aiBots = [
    "GPTBot", "OAI-SearchBot", "ChatGPT-User", // OpenAI
    "PerplexityBot", "Perplexity-User", // Perplexity
    "ClaudeBot", "anthropic-ai", "Claude-User", // Anthropic
    "Google-Extended", // Gemini / AI Overviews
    "Bingbot", "Applebot-Extended", // Bing / Apple
    "Yeti", "Daumoa", // 네이버 / 다음
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...aiBots.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
