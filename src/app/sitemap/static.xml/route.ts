import { buildUrlEntry, wrapUrlset, xmlResponse } from "@/lib/sitemap-utils";

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
const DEPLOYED_AT = new Date().toISOString();

export async function GET(): Promise<Response> {
  const now = DEPLOYED_AT;
  const urls = STATIC_PAGES.map((entry) =>
    buildUrlEntry(entry.path || "/", now, entry.changefreq, entry.priority),
  ).join("");
  return xmlResponse(wrapUrlset(urls));
}
