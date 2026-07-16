import Link from "next/link";

interface SeoPaginationProps {
  currentPage: number;
  totalPages: number;
  /** 페이지 링크 기준 경로 (예: "/portfolios"). page>1 은 ?page=N 이 붙는다. */
  basePath: string;
}

// 봇이 링크를 타고 전 페이지를 순회하도록 <button> 이 아닌 실제 <a href> (next/link) 로 렌더.
// 터치 타겟은 반언니 규칙(≥44×44) 준수: min-h-11 min-w-11.
const LINK_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ACTIVE_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-border bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground";
const ELLIPSIS_CLASS = "px-1 text-sm text-muted-foreground";

/**
 * 목록 canonical 과 페이지네이션 링크가 공유하는 정규 URL 규칙.
 * page 1 은 파라미터 없는 정규 URL(중복 색인 방지), 2 이상만 ?page=N.
 */
export function hrefForPage(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

/** 현재 페이지 ±2 = 최대 5개 번호를 노출. */
function pageWindow(current: number, total: number): number[] {
  const span = 2;
  const start = Math.max(1, current - span);
  const end = Math.min(total, current + span);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

export function SeoPagination({
  currentPage,
  totalPages,
  basePath,
}: Readonly<SeoPaginationProps>): React.ReactElement | null {
  if (totalPages <= 1) return null;

  const pages = pageWindow(currentPage, totalPages);
  const showFirst = pages[0] > 1;
  const showLast = pages[pages.length - 1] < totalPages;

  return (
    <nav className="mt-8 mb-4 flex justify-center" aria-label="페이지 이동">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {currentPage > 1 && (
          <li>
            <Link href={hrefForPage(basePath, currentPage - 1)} rel="prev" className={LINK_CLASS} aria-label="이전 페이지">
              이전
            </Link>
          </li>
        )}
        {showFirst && (
          <li>
            <Link href={hrefForPage(basePath, 1)} className={LINK_CLASS} aria-label="1 페이지">
              1
            </Link>
          </li>
        )}
        {showFirst && pages[0] > 2 && (
          <li aria-hidden="true" className={ELLIPSIS_CLASS}>
            …
          </li>
        )}
        {pages.map((p) =>
          p === currentPage ? (
            <li key={p}>
              <span className={ACTIVE_CLASS} aria-current="page">
                {p}
              </span>
            </li>
          ) : (
            <li key={p}>
              <Link href={hrefForPage(basePath, p)} className={LINK_CLASS} aria-label={`${p} 페이지`}>
                {p}
              </Link>
            </li>
          ),
        )}
        {showLast && pages[pages.length - 1] < totalPages - 1 && (
          <li aria-hidden="true" className={ELLIPSIS_CLASS}>
            …
          </li>
        )}
        {showLast && (
          <li>
            <Link href={hrefForPage(basePath, totalPages)} className={LINK_CLASS} aria-label={`${totalPages} 페이지`}>
              {totalPages}
            </Link>
          </li>
        )}
        {currentPage < totalPages && (
          <li>
            <Link href={hrefForPage(basePath, currentPage + 1)} rel="next" className={LINK_CLASS} aria-label="다음 페이지">
              다음
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
