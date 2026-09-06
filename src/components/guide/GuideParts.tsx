import Link from "next/link";
import type { Guide } from "@/lib/guides";
import type { EncyclopediaLink } from "@/lib/guides";

export const CTA_PRIMARY =
  "inline-flex min-h-11 items-center rounded-full bg-brand-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
export const CTA_SECONDARY =
  "inline-flex min-h-11 items-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:border-brand-primary hover:bg-muted focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const LIST_LINK =
  "block truncate rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:border-brand-primary hover:bg-muted focus-visible:border-brand-primary focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const TOC_LINK =
  "rounded-sm text-brand-primary transition-colors hover:text-brand-primary-hover focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** 목차 — 실제 섹션 id 만 링크한다(죽은 앵커 금지). */
export function GuideToc({ guide }: Readonly<{ guide: Guide }>): React.ReactElement {
  return (
    <nav aria-label="목차" className="mt-8 rounded-lg border border-border bg-muted/40 p-4">
      <p className="mb-2 text-sm font-semibold text-foreground">이 글의 차례</p>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {guide.sections.map((s, i) => (
          <li key={s.heading}>
            <a href={`#section-${i + 1}`} className={TOC_LINK}>
              {s.heading}
            </a>
          </li>
        ))}
        <li>
          <a href="#faq" className={TOC_LINK}>
            자주 묻는 질문
          </a>
        </li>
      </ol>
    </nav>
  );
}

export function GuideSections({ guide }: Readonly<{ guide: Guide }>): React.ReactElement {
  return (
    <>
      {guide.sections.map((s, i) => (
        <section key={s.heading} id={`section-${i + 1}`} className="mt-10 scroll-mt-24">
          <h2 className="text-xl font-bold text-foreground md:text-2xl">{s.heading}</h2>
          <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-foreground/90">
            {s.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>
      ))}
      <section className="mt-10 rounded-lg border border-border bg-card p-5" aria-labelledby="checklist-heading">
        <h2 id="checklist-heading" className="text-lg font-bold text-foreground">
          상담할 때 확인할 것
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-foreground/90">
          {guide.checklist.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function GuideFaq({ guide }: Readonly<{ guide: Guide }>): React.ReactElement {
  return (
    <section id="faq" className="mt-10 scroll-mt-24" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="text-xl font-bold text-foreground md:text-2xl">
        자주 묻는 질문
      </h2>
      <div className="mt-3 divide-y divide-border border-y border-border">
        {guide.faq.map((f) => (
          <details key={f.q} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-[15px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              {f.q}
              <span aria-hidden="true" className="text-xl font-light text-muted-foreground group-open:hidden">
                +
              </span>
              <span aria-hidden="true" className="hidden text-xl font-light text-muted-foreground group-open:inline">
                −
              </span>
            </summary>
            <p className="pb-4 text-[15px] leading-relaxed text-foreground/90">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function GuideCta({ guide, label }: Readonly<{ guide: Guide; label: string }>): React.ReactElement {
  return (
    <section className="mt-10 rounded-lg bg-brand-primary/10 p-5 text-center" aria-labelledby="cta-heading">
      <h2 id="cta-heading" className="text-lg font-bold text-foreground">
        {label}, 실제 시술 사진과 가격으로 비교하세요
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        전국 아티스트가 등록한 작품에서 스타일과 가격을 보고, 마음에 드는 샵에 바로 상담을 보낼 수 있습니다.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link href={guide.listingPath} className={CTA_PRIMARY}>
          {label} 작품 보기
        </Link>
        <Link href="/artists" className={CTA_SECONDARY}>
          내 주변 샵 찾기
        </Link>
      </div>
    </section>
  );
}

/** 지역 가이드·백과로 나가는 링크 — 허브가 사이트의 긴 글들을 서로 잇는 자리다. */
export function GuideRelatedLists({
  locations,
  encyclopedia,
}: Readonly<{
  locations: ReadonlyArray<{ slug: string; title: string }>;
  encyclopedia: ReadonlyArray<EncyclopediaLink>;
}>): React.ReactElement {
  return (
    <>
      {locations.length > 0 && (
        <section className="mt-8 border-t border-border pt-6" aria-labelledby="guide-location-heading">
          <h2 id="guide-location-heading" className="mb-3 text-base font-bold text-foreground md:text-lg">
            지역별 반영구 가이드
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {locations.map((l) => (
              <li key={l.slug}>
                <Link href={`/location/${l.slug}`} title={l.title} className={LIST_LINK}>
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {encyclopedia.length > 0 && (
        <section className="mt-8 border-t border-border pt-6" aria-labelledby="guide-enc-heading">
          <h2 id="guide-enc-heading" className="mb-3 text-base font-bold text-foreground md:text-lg">
            더 읽어 볼 반영구 백과
          </h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {encyclopedia.map((e) => (
              <li key={e.slug}>
                <Link href={`/encyclopedia/${e.slug}`} title={e.title} className={LIST_LINK}>
                  {e.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
