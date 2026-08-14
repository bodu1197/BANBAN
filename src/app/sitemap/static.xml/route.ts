import { buildUrlEntry, wrapUrlset, xmlResponse } from "@/lib/sitemap-utils";
import { countPublicPortfolios, LISTING_PAGE_SIZE } from "@/lib/supabase/portfolio-listing-queries";
import { hrefForPage } from "@/components/shared/SeoPagination";

interface StaticEntry {
  path: string;
  priority: string;
  changefreq: string;
}

/**
 * 사이트맵에서 뺀 것 — 콘텐츠가 채워지면 이 목록에 다시 추가할 것(한 줄이면 된다).
 *   /courses  : DB 0건
 *   /reviews  : DB 3건
 *   /benefits : 실질 본문 없음
 * 빈 페이지를 priority 0.6~0.7 로 계속 제출하면 사이트 전체 품질 평가가 내려간다
 * (2026-08-14 실측: 셋 다 GSC "발견됨 - 현재 색인이 생성되지 않음").
 */
const STATIC_PAGES: StaticEntry[] = [
  { path: "",                priority: "1.0", changefreq: "daily"   },
  { path: "/artists",        priority: "0.9", changefreq: "daily"   },
  { path: "/portfolios",     priority: "0.9", changefreq: "daily"   },
  { path: "/discount",       priority: "0.9", changefreq: "daily"   },
  { path: "/women-beauty",   priority: "0.9", changefreq: "daily"   },
  { path: "/mens-beauty",    priority: "0.9", changefreq: "daily"   },
  { path: "/location",       priority: "0.8", changefreq: "daily"   },
  { path: "/exhibition",     priority: "0.7", changefreq: "weekly"  },
  { path: "/community",      priority: "0.7", changefreq: "daily"   },
  { path: "/events",         priority: "0.7", changefreq: "daily"   },
  { path: "/study-news",     priority: "0.6", changefreq: "weekly"  },
  { path: "/beauty-sim/ai-test", priority: "0.7", changefreq: "monthly" },
  { path: "/about",          priority: "0.4", changefreq: "monthly" },
  { path: "/partnership",    priority: "0.4", changefreq: "monthly" },
  { path: "/contact",        priority: "0.3", changefreq: "monthly" },
  { path: "/terms",          priority: "0.2", changefreq: "yearly"  },
  { path: "/privacy",        priority: "0.2", changefreq: "yearly"  },
  { path: "/refund-policy",  priority: "0.2", changefreq: "yearly"  },
];

// 배포 시점 고정 — 매 요청 "지금" 을 lastmod 로 내보내면 구글이 lastmod 신호를 통째로 버린다.
// 정적 페이지가 실제로 바뀌는 시점이 곧 배포 시점이다.
// 런타임 `new Date()` 는 배포 시각이 아니라 람다 콜드스타트 시각이므로 빌드 상수를 쓴다(next.config.ts).
const DEPLOYED_AT = process.env.BUILD_TIME ?? new Date(0).toISOString();

/** 목록 페이지네이션 — 매일 내용이 바뀌지만 1페이지(0.9)보다는 아래. */
const PAGINATION_CHANGEFREQ = "daily";
const PAGINATION_PRIORITY = "0.6";

/**
 * 목록 2페이지 이후(/portfolios/page/N).
 *
 * 링크로도 닿지만(SeoPagination), 방금 `?page=N` → `/page/N` 으로 주소를 옮겼기 때문에
 * 새 주소를 직접 제출해 재색인을 앞당긴다. URL 모양은 hrefForPage 하나만 안다.
 */
async function portfolioPaginationUrls(now: string): Promise<string> {
  try {
    const total = await countPublicPortfolios();
    const totalPages = Math.ceil(total / LISTING_PAGE_SIZE);
    const pages = Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => i + 2);
    return pages
      .map((n) => buildUrlEntry(hrefForPage("/portfolios", n), now, PAGINATION_CHANGEFREQ, PAGINATION_PRIORITY))
      .join("");
  } catch (reason) {
    // 개수를 못 세면 정적 목록만 내보낸다 — 여기서 500 을 내면 사이트맵이 통째로 사라진다.
    // 다만 조용히 비면 아무도 모르므로 반드시 남긴다(sitemap-utils 의 settledCount 와 같은 이유).
    // eslint-disable-next-line no-console -- 사이트맵 누락은 로그 없이는 발견이 불가능하다
    console.error("[sitemap] 포트폴리오 페이지네이션 개수 조회 실패:", reason);
    return "";
  }
}

export async function GET(): Promise<Response> {
  const now = DEPLOYED_AT;
  const urls = STATIC_PAGES.map((entry) =>
    buildUrlEntry(entry.path || "/", now, entry.changefreq, entry.priority),
  ).join("");
  return xmlResponse(wrapUrlset(urls + (await portfolioPaginationUrls(now))));
}
