import type { Metadata } from "next";
import { Suspense } from "react";
import { STRINGS } from "@/lib/strings";
import { buildPageSeo, getOrganizationJsonLd, jsonLdSafe } from "@/lib/seo";
import { fetchEyebrowPortfolios, fetchLipPortfolios, fetchMensEyebrowPortfolios, fetchTimeSalePortfolios } from "@/lib/supabase/home-portfolio-queries";
import { fetchPopularEvents } from "@/lib/supabase/event-queries";
import { fetchExhibitions, type ExhibitionItem } from "@/lib/supabase/exhibition-queries";
import { PromoBannerGrid } from "@/components/home/PromoBannerGrid";
import { SectionHeader } from "@/components/home/SectionHeader";
import { SalePortfolioCard } from "@/components/home/cards";
import { ExhibitionCard } from "@/components/exhibition/ExhibitionCard";
import { AiBanner } from "@/components/home/AiBanner";
import { HorizontalScrollList } from "@/components/home/HorizontalScrollList";
import { ExhibitionBanner } from "@/components/home/ExhibitionBanner";
import { QuickMenu } from "@/components/home/QuickMenu";
import { TimeSaleSection } from "@/components/home/TimeSaleSection";
import type { HomePortfolio } from "@/lib/supabase/home-queries";
import { fetchPromoBanners, fetchHomeBanners, fetchQuickMenuItems } from "@/lib/supabase/banner-queries";
import { LazyHomeSection } from "@/components/home/LazyHomeSection";
import { HomeSearchTrigger } from "@/components/home/HomeSearchTrigger";
import { HomePopularKeywords } from "@/components/home/HomePopularKeywords";
import { HomeHeroCarousel } from "@/components/home/HomeHeroCarousel";
import { fetchHeroBanners } from "@/lib/supabase/hero-banner-queries";
import { RecentEventsSection } from "@/components/home/RecentEventsSection";
import { AiTestPromoBanner } from "@/components/home/AiTestPromoBanner";
import { PopularEventsList } from "@/components/home/PopularEventsList";



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

function HomeExhibitionSection({ items, title, moreText }: Readonly<{
  items: ExhibitionItem[];
  title: string;
  moreText?: string;
}>): React.ReactElement | null {
  if (items.length === 0) return null;
  return (
    <section className="py-4">
      <SectionHeader title={title} moreLink="/exhibition" moreText={moreText} />
      <HorizontalScrollList>
        {items.map((item) => (
          <div key={item.id} className="w-[320px] shrink-0 md:w-[420px]">
            <ExhibitionCard item={item} />
          </div>
        ))}
      </HorizontalScrollList>
    </section>
  );
}

function CuratedExhibitions({ hp, exhibitions }: Readonly<{
  hp: Record<string, string>;
  exhibitions: ExhibitionItem[];
}>): React.ReactElement {
  return (
    <>
      <AiTestPromoBanner />
      <HomeExhibitionSection
        items={exhibitions}
        title="진행 중인 기획전"
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
    safe(() => fetchPopularEvents(30), []),
  ]);
  return { promoBanners, homeBanners, quickMenuItems, popularEvents };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function fetchBottomHomeData() {
  const [timeSalePortfolios, eyebrowPortfolios, lipPortfolios, exhibitions, mensEyebrowPortfolios] = await Promise.all([
    safe(() => fetchTimeSalePortfolios(10), []),
    safe(() => fetchEyebrowPortfolios(10), []),
    safe(() => fetchLipPortfolios(10), []),
    safe(() => fetchExhibitions(), []),
    safe(() => fetchMensEyebrowPortfolios(10), []),
  ]);

  return { timeSalePortfolios, eyebrowPortfolios, lipPortfolios, exhibitions, mensEyebrowPortfolios };
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
        <CuratedExhibitions hp={hp} exhibitions={homeData.exhibitions} />
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
        <RecentEventsSection />
        {popularEvents.length > 0 && (
          <section className="py-4">
            <SectionHeader
              title={STRINGS.homepage.popularEventsSection}
              moreLink="/events"
              moreText={STRINGS.homepage.seeMore}
            />
            <HorizontalScrollList>
              <PopularEventsList events={popularEvents} />
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
