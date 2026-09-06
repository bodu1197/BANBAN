import Link from "next/link";
import { GUIDES } from "@/lib/guides";

const LINK_CLASS =
  "inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-sm text-foreground transition-colors hover:border-brand-primary hover:bg-muted focus-visible:border-brand-primary focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** 시술별 허브로 가는 칩 목록 — 지역 가이드·허브 페이지 하단에서 공유(서로 잇는 크롤 경로). */
export function GuideNavLinks({
  exceptSlug,
  heading = "시술별 반영구 가이드",
}: Readonly<{ exceptSlug?: string; heading?: string }>): React.ReactElement {
  return (
    <section className="mt-8 border-t border-border pt-6" aria-labelledby="guide-nav-heading">
      <h2 id="guide-nav-heading" className="mb-3 text-base font-bold text-foreground md:text-lg">
        {heading}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {GUIDES.filter((g) => g.slug !== exceptSlug).map((g) => (
          <li key={g.slug}>
            <Link href={`/guide/${g.slug}`} className={LINK_CLASS}>
              {g.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
