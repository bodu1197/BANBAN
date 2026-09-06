import Link from "next/link";
import { GUIDES, fetchRecentEncyclopediaLinks } from "@/lib/guides";
import { fetchLocationSeoList } from "@/lib/location-seo/queries";

const LINK_CLASS =
  "block truncate rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:border-brand-primary hover:bg-muted focus-visible:border-brand-primary focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const LOCATION_LIMIT = 12;
const ENCYCLOPEDIA_LIMIT = 8;

/**
 * 홈 하단 "읽을거리" — 시술 허브 6편, 지역 가이드, 백과로 나가는 **서버 렌더 링크**.
 * 🔴 이 셋은 사이트에서 글자가 가장 많은 페이지(4,500~5,000자)인데 홈에서 가는 링크가 0개였다
 *    (2026-09-07 실측: 홈 내부 링크 98개 중 location·encyclopedia 0). 사이트맵으로만 알려진 페이지는
 *    구글이 "발견됨-색인 안 됨"으로 미뤄 둔다. 홈에서 링크가 걸려야 크롤 우선순위가 생긴다.
 */
export async function HomeGuideLinks(): Promise<React.ReactElement> {
  const [{ items: locations }, encyclopedia] = await Promise.all([
    fetchLocationSeoList({ limit: LOCATION_LIMIT }),
    fetchRecentEncyclopediaLinks(ENCYCLOPEDIA_LIMIT),
  ]);

  return (
    <section className="px-4 py-6" aria-labelledby="home-guide-heading">
      <h2 id="home-guide-heading" className="mb-2.5 text-lg font-bold">
        시술 전에 읽는 반영구 가이드
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guide/${g.slug}`} className={LINK_CLASS}>
              {g.label} 가이드
            </Link>
          </li>
        ))}
      </ul>

      {locations.length > 0 && (
        <>
          <h3 className="mt-6 mb-2 text-base font-semibold">지역별 반영구 가이드</h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {locations.map((l) => (
              <li key={l.slug}>
                <Link href={`/location/${l.slug}`} title={l.title} className={LINK_CLASS}>
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/location"
            className="mt-2 inline-flex rounded-sm text-sm font-medium text-brand-primary transition-colors hover:text-brand-primary-hover focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            지역별 가이드 전체 보기 →
          </Link>
        </>
      )}

      {encyclopedia.length > 0 && (
        <>
          <h3 className="mt-6 mb-2 text-base font-semibold">반영구 백과</h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {encyclopedia.map((e) => (
              <li key={e.slug}>
                <Link href={`/encyclopedia/${e.slug}`} title={e.title} className={LINK_CLASS}>
                  {e.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
