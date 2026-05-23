import type { Metadata } from "next";
import { Suspense } from "react";
import { STRINGS } from "@/lib/strings";
import { buildPageSeo, getOrganizationJsonLd, jsonLdSafe } from "@/lib/seo";
import { fetchEyebrowPortfolios, fetchLipPortfolios, fetchMensEyebrowPortfolios, fetchTimeSalePortfolios } from "@/lib/supabase/home-portfolio-queries";
import Link from "next/link";
import { fetchPopularEvents, type EventCardData } from "@/lib/supabase/event-queries";
import { SquareImage } from "@/components/home/SquareImage";
import { PromoBannerGrid } from "@/components/home/PromoBannerGrid";
import { SectionHeader } from "@/components/home/SectionHeader";
import { SalePortfolioCard, PopularArtistCard } from "@/components/home/cards";
import { AiBanner } from "@/components/home/AiBanner";
import { HorizontalScrollList } from "@/components/home/HorizontalScrollList";
import { ExhibitionBanner } from "@/components/home/ExhibitionBanner";
import { QuickMenu } from "@/components/home/QuickMenu";
import { TimeSaleSection } from "@/components/home/TimeSaleSection";
import type { HomePortfolio, HomeArtist } from "@/lib/supabase/home-queries";
import { fetchPromoBanners, fetchHomeBanners, fetchQuickMenuItems } from "@/lib/supabase/banner-queries";
import { fetchNewArtists } from "@/lib/supabase/home-artist-queries";
import { LazyHomeSection } from "@/components/home/LazyHomeSection";
import { HomeSearchTrigger } from "@/components/home/HomeSearchTrigger";
import { HomePopularKeywords } from "@/components/home/HomePopularKeywords";
import { HomeHeroCarousel } from "@/components/home/HomeHeroCarousel";
import { fetchHeroBanners } from "@/lib/supabase/hero-banner-queries";



export async function generateHomeMetadata(): Promise<Metadata> {
  const title = "반언니 - 반영구 화장 가격비교 & 아티스트 추천 | 대한민국 1등 반영구 플랫폼";
  const description = "반영구 잘하는 곳 찾을 땐 반언니! 전국 반영구 아티스트 포트폴리오와 가격을 한곳에서 비교하세요. 눈썹·입술·아이라인·헤어라인 시술 가격과 후기, 위치별 인증 아티스트를 만나볼 수 있는 대한민국 1등 반영구 플랫폼입니다.";

  return {
    title,
    description,
    keywords: ["반영구", "반영구 화장", "반영구 잘하는 곳", "눈썹 문신", "입술 반영구", "아이라인", "반영구 가격비교", "반영구 아티스트"],
    ...buildPageSeo({ title, description, path: "/" }),
  };
}

function ScrollSection({ items, title, moreLink, keyPrefix, moreText }: Readonly<{
  items: HomePortfolio[];
  title: string;
  moreLink: string;
  keyPrefix?: string;
  moreText?: string;
}>): React.ReactElement | null {
  if (items.length === 0) return null;
  return (
    <section className="py-4">
      <SectionHeader title={title} moreLink={moreLink} moreText={moreText} />
      <HorizontalScrollList>
        {items.map((p, i) => (
          <SalePortfolioCard
            key={`${keyPrefix ?? ""}${p.id}`}
            portfolio={p}
              priority={i === 0}
          />
        ))}
      </HorizontalScrollList>
    </section>
  );
}

interface SectionLocaleProps {
  hp: Record<string, string>;
  common: Record<string, string>;
}

function DiscoverSections({ hp, eyebrowPortfolios }: Readonly<
  SectionLocaleProps & {
    eyebrowPortfolios: HomePortfolio[];
  }
>): React.ReactElement {
  return (
    <ScrollSection
      items={eyebrowPortfolios}
      title={hp.eyebrowSection}
      moreLink="/women-beauty"
      keyPrefix="eyebrow-"
      moreText={hp.seeMore}
    />
  );
}

function CategorySections({ hp, lipPortfolios, mensEyebrowPortfolios }: Readonly<
  SectionLocaleProps & {
    lipPortfolios: HomePortfolio[];
    mensEyebrowPortfolios: HomePortfolio[];
  }
>): React.ReactElement {
  return (
    <>
      <ScrollSection
        items={lipPortfolios}
        title={hp.lipSection}
        moreLink="/women-beauty"
        keyPrefix="lip-"
        moreText={hp.seeMore}
      />
      <ScrollSection
        items={mensEyebrowPortfolios}
        title={hp.mensEyebrowSection}
        moreLink="/mens-beauty?categoryIds=88ef678a-bb80-4b65-87c4-79e5b503cf52"
        keyPrefix="mens-eyebrow-"
        moreText={hp.seeMore}
      />
    </>
  );
}

function PopularEventCard({ event, priority = false }: Readonly<{
  event: EventCardData;
  priority?: boolean;
}>): React.ReactElement {
  return (
    <Link
      href={`/events/${event.id}`}
      className="group inline-block w-60 shrink-0 snap-start whitespace-normal mr-[15px] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <SquareImage
        src={event.hero_image}
        alt={event.title}
        sizes="240px"
        priority={priority}
      />
      <div className="mt-2.5">
        <p className="truncate text-base font-semibold transition-colors group-hover:text-brand-primary group-focus-visible:text-brand-primary">
          {event.title}
        </p>
        <p className="truncate text-sm text-muted-foreground">{event.procedure_name}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          {(event.discount_rate ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground line-through">
              {event.price_origin.toLocaleString()}원
            </span>
          )}
          <span className="text-sm font-bold">{event.price.toLocaleString()}원</span>
          {(event.discount_rate ?? 0) > 0 && (
            <span className="text-xs font-bold text-red-500">{event.discount_rate}%</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ActiveArtistSection({ artists, title, moreText }: Readonly<{
  artists: HomeArtist[];
  title: string;
  moreText?: string;
}>): React.ReactElement | null {
  if (artists.length === 0) return null;
  return (
    <section className="py-4">
      <SectionHeader title={title} moreLink="/artists" moreText={moreText} />
      <HorizontalScrollList>
        {artists.map((a, i) => (
          <PopularArtistCard key={a.id} artist={a} priority={i === 0} />
        ))}
      </HorizontalScrollList>
    </section>
  );
}

function CuratedExhibitions({ hp, activeArtists }: Readonly<{
  hp: Record<string, string>;
  activeArtists: HomeArtist[];
}>): React.ReactElement {
  return (
    <>
      <ActiveArtistSection
        artists={activeArtists}
        title={hp.todayActiveArtists ?? "오늘의 인기 아티스트"}
        moreText={hp.seeMore}
      />
    </>
  );
}


/** Safely run an async fetch, returning fallback on error to prevent one section from breaking others */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e: unknown) {
    // eslint-disable-next-line no-console
    console.error("[Home] Section fetch failed:", e instanceof Error ? e.message : e);
    return fallback;
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function fetchTopHomeData() {
  const [promoBanners, homeBanners, quickMenuItems, popularEvents] = await Promise.all([
    safe(() => fetchPromoBanners(), []),
    safe(() => fetchHomeBanners(), []),
    safe(() => fetchQuickMenuItems(), []),
    safe(() => fetchPopularEvents(10), []),
  ]);
  return { promoBanners, homeBanners, quickMenuItems, popularEvents };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function fetchBottomHomeData() {
  const [timeSalePortfolios, eyebrowPortfolios, lipPortfolios, activeArtists, mensEyebrowPortfolios] = await Promise.all([
    safe(() => fetchTimeSalePortfolios(10), []),
    safe(() => fetchEyebrowPortfolios(10), []),
    safe(() => fetchLipPortfolios(10), []),
    safe(() => fetchNewArtists(5), []),
    safe(() => fetchMensEyebrowPortfolios(10), []),
  ]);

  return { timeSalePortfolios, eyebrowPortfolios, lipPortfolios, activeArtists, mensEyebrowPortfolios };
}

function HomeDiscoverySections({
  hp,
  common,
  homeData,
}: Readonly<{
  hp: Record<string, string>;
  common: Record<string, string>;
  homeData: {
    eyebrowPortfolios: HomePortfolio[];
  };
}>): React.ReactElement {
  const { eyebrowPortfolios } = homeData;
  return (
    <LazyHomeSection>
      <DiscoverSections
        hp={hp}
        common={common}
        eyebrowPortfolios={eyebrowPortfolios}
      />
    </LazyHomeSection>
  );
}

function HomeCategorySections({
  hp,
  common,
  homeData,
}: Readonly<{
  hp: Record<string, string>;
  common: Record<string, string>;
  homeData: {
    lipPortfolios: HomePortfolio[];
    mensEyebrowPortfolios: HomePortfolio[];
  };
}>): React.ReactElement {
  const { lipPortfolios, mensEyebrowPortfolios } = homeData;
  return (
    <LazyHomeSection>
      <CategorySections
        hp={hp}
        common={common}
        lipPortfolios={lipPortfolios}
        mensEyebrowPortfolios={mensEyebrowPortfolios}
      />
    </LazyHomeSection>
  );
}

async function AsyncHomeBottom(): Promise<React.ReactElement> {
  const homeData = await fetchBottomHomeData();
  const hp = STRINGS.homepage as unknown as Record<string, string>;
  const common = STRINGS.common as unknown as Record<string, string>;

  return (
    <>
      <TimeSaleSection
        items={homeData.timeSalePortfolios}
        title={hp.timeSaleSection}
        moreLink="/discount"
        moreText={hp.seeMore}
      />
      <LazyHomeSection size="md">
        <CuratedExhibitions hp={hp} activeArtists={homeData.activeArtists} />
      </LazyHomeSection>
      <HomeDiscoverySections hp={hp} common={common} homeData={homeData} />
      <HomeCategorySections hp={hp} common={common} homeData={homeData} />
    </>
  );
}

function HomeBottomSkeleton(): React.ReactElement {
  return (
    <>
      <div aria-hidden="true" className="w-full min-h-[290px]" />
      <div aria-hidden="true" className="w-full min-h-[400px]" />
      <div aria-hidden="true" className="w-full min-h-[500px]" />
      <div aria-hidden="true" className="w-full min-h-[500px]" />
    </>
  );
}

export async function renderHomePage(): Promise<React.ReactElement> {
  const [topData, heroBanners] = await Promise.all([fetchTopHomeData(), fetchHeroBanners()]);
  const { promoBanners, homeBanners, quickMenuItems, popularEvents } = topData;

  const exhibitionBanner = homeBanners.find((b) => b.slot === "exhibition");
  const aiBanner = homeBanners.find((b) => b.slot === "ai-matching");

  const organizationJsonLd = getOrganizationJsonLd();

  return (
    <main className="mx-auto w-full max-w-[1024px] overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(organizationJsonLd) }}
      />
      <div className="mx-auto w-full max-w-[1024px]">
        {/* 바비톡 패턴 순서: 검색바 → 인기검색어 → 히어로 캐러셀 → 퀵메뉴 → ... */}
        <HomeSearchTrigger />
        <HomePopularKeywords />
        <HomeHeroCarousel banners={heroBanners} />
        <div className="pt-4">
          <QuickMenu items={quickMenuItems} />
        </div>
        {popularEvents.length > 0 && (
          <section className="py-4">
            <SectionHeader
              title={STRINGS.homepage.popularEventsSection}
              moreLink="/events"
              moreText={STRINGS.homepage.seeMore}
            />
            <HorizontalScrollList>
              {popularEvents.map((event, i) => (
                <PopularEventCard key={event.id} event={event} priority={i === 0} />
              ))}
            </HorizontalScrollList>
          </section>
        )}
        {(exhibitionBanner ?? aiBanner) ? (
          <div className="grid grid-cols-1 gap-3 px-4 pt-3 pb-1 md:grid-cols-2">
            {exhibitionBanner ? (
              <ExhibitionBanner
                imageUrl={exhibitionBanner.image_path}
                linkUrl={exhibitionBanner.link_url}
                altText={exhibitionBanner.alt_text}
              />
            ) : null}
            {aiBanner ? (
              <AiBanner
                imageUrl={aiBanner.image_path}
                linkUrl={aiBanner.link_url}
                altText={aiBanner.alt_text}
              />
            ) : null}
          </div>
        ) : null}
        <PromoBannerGrid banners={promoBanners} />
        <Suspense fallback={<HomeBottomSkeleton />}>
          <AsyncHomeBottom />
        </Suspense>
      </div>
    </main>
  );
}
