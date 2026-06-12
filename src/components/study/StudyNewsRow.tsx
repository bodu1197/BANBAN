// 뉴스 한 줄(목록·홈카드 공용 서버 컴포넌트). compact=요약 생략.
import Link from "next/link";
import { fmtDate, safeSourceUrl } from "@/lib/study-news/format";
import type { StudyNewsItem } from "@/lib/study-news/store";

export function StudyNewsSourceBadge({ tier }: Readonly<{ tier: number }>): React.ReactElement {
  return tier === 1 ? (
    <span className="shrink-0 rounded-full bg-brand-primary px-2 py-0.5 text-[0.7rem] font-semibold text-white">공식</span>
  ) : (
    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.7rem] font-semibold text-muted-foreground">언론</span>
  );
}

export function StudyNewsRow({ item, compact = false }: Readonly<{ item: StudyNewsItem; compact?: boolean }>): React.ReactElement {
  const src = safeSourceUrl(item.sourceUrl);
  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-1.5 flex items-center gap-2 text-xs">
        <StudyNewsSourceBadge tier={item.tier} />
        <span className="truncate text-muted-foreground">{item.sourceName}</span>
        <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{fmtDate(item.publishedAt)}</span>
      </div>
      <Link href={`/study-news/${item.slug}`} className="group block focus-visible:outline-none">
        <p className="font-bold leading-snug transition-colors group-hover:text-brand-primary group-focus-visible:text-brand-primary">{item.title}</p>
        {compact ? null : <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>}
      </Link>
      {!compact && src ? (
        <a href={src} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-block text-xs font-medium text-brand-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">원문 보기 →</a>
      ) : null}
    </li>
  );
}
