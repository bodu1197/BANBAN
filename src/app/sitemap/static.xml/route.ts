import { buildUrlEntry, wrapUrlset, xmlResponse } from "@/lib/sitemap-utils";

interface StaticEntry {
  path: string;
  priority: string;
  changefreq: string;
}

const STATIC_PAGES: StaticEntry[] = [
  { path: "",                priority: "1.0", changefreq: "daily"   },
  { path: "/artists",        priority: "0.9", changefreq: "daily"   },
  { path: "/portfolios",     priority: "0.9", changefreq: "daily"   },
  { path: "/discount",       priority: "0.9", changefreq: "daily"   },
  { path: "/women-beauty",   priority: "0.9", changefreq: "daily"   },
  { path: "/mens-beauty",    priority: "0.9", changefreq: "daily"   },
  { path: "/encyclopedia",   priority: "0.9", changefreq: "daily"   },
  { path: "/exhibition",     priority: "0.7", changefreq: "weekly"  },
  { path: "/courses",        priority: "0.7", changefreq: "weekly"  },
  { path: "/community",      priority: "0.6", changefreq: "daily"   },
  { path: "/benefits",       priority: "0.6", changefreq: "weekly"  },
  { path: "/reviews",        priority: "0.6", changefreq: "daily"   },
  { path: "/about",          priority: "0.4", changefreq: "monthly" },
  { path: "/partnership",    priority: "0.4", changefreq: "monthly" },
  { path: "/contact",        priority: "0.3", changefreq: "monthly" },
  { path: "/terms",          priority: "0.2", changefreq: "yearly"  },
  { path: "/privacy",        priority: "0.2", changefreq: "yearly"  },
  { path: "/refund-policy",  priority: "0.2", changefreq: "yearly"  },
];

export async function GET(): Promise<Response> {
  const now = new Date().toISOString();
  const urls = STATIC_PAGES.map((entry) =>
    buildUrlEntry(entry.path || "/", now, entry.changefreq, entry.priority),
  ).join("");
  return xmlResponse(wrapUrlset(urls));
}
