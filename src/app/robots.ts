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

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api",
          "/api/*",
          "/mypage",
          "/mypage/*",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
