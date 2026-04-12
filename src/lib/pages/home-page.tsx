import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { fetchEyebrowPortfolios, fetchLipPortfolios, fetchMensEyebrowPortfolios, fetchTimeSalePortfolios } from "@/lib/supabase/home-portfolio-queries";
import { QuickMenu } from "@/components/home/QuickMenu";
import { SectionHeader } from "@/components/home/SectionHeader";
import { SalePortfolioCard, PopularArtistCard } from "@/components/home/cards";
import { AiBanner } from "@/components/home/AiBanner";
import { HorizontalScrollList } from "@/components/home/HorizontalScrollList";
import { BeautySimBanner } from "@/components/home/BeautySimBanner";
import { ExhibitionBanner } from "@/components/home/ExhibitionBanner";
import { TimeSaleSection } from "@/components/home/TimeSaleSection";
import type { HomePortfolio, HomeArtist } from "@/lib/supabase/home-queries";
import { fetchActiveBanner } from "@/lib/supabase/banner-queries";
import { fetchActiveArtists } from "@/lib/supabase/home-artist-queries";
import { LazyHomeSection } from "@/components/home/LazyHomeSection";



export async function generateHomeMetadata(): Promise<Metadata> {
  const title = "반언니 - 타투 가격비교 & 타투이스트 추천 | 대한민국 1등 타투 플랫폼";
  const description = "타투 잘하는 곳 찾을 땐 반언니! 전국 타투샵 가격비교, 타투이스트 포트폴리오, 반영구·레터링·감성타투까지. 200만 회원이 선택한 대한민국 최대 타투 플랫폼.";

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    alternates: getAlternates("/"),
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
    <>
      <ScrollSection
        items={eyebrowPortfolios}
        title={hp.eyebrowSection}
        moreLink="/women-beauty"
        keyPrefix="eyebrow-"
        moreText={hp.seeMore}
      />
      <BeautySimBanner />
    </>
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

function BannerRow({ hp }: Readonly<{ hp: Record<string, string> }>): React.ReactElement {
  const bannerLabels = {
    aiBannerHeadline: hp.aiBannerHeadline,
    aiBannerDesc: hp.aiBannerDesc,
    aiBannerPhoto: hp.aiBannerPhoto,
    aiBannerText: hp.aiBannerText,
  };
  return <AiBanner labels={bannerLabels} />;
}

/** Safely run an async fetch, returning fallback on error to prevent one section from breaking others */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[Home] Section fetch failed:", e instanceof Error ? e.message : e);
    return fallback;
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function fetchTopHomeData() {
  const heroBanner = await safe(() => fetchActiveBanner(), null);
  return { heroBanner };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function fetchBottomHomeData() {
  const [timeSalePortfolios, eyebrowPortfolios, lipPortfolios, activeArtists, mensEyebrowPortfolios] = await Promise.all([
    safe(() => fetchTimeSalePortfolios(10), []),
    safe(() => fetchEyebrowPortfolios(10), []),
    safe(() => fetchLipPortfolios(10), []),
    safe(() => fetchActiveArtists(10), []),
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

export async function renderHomePage(): Promise<React.ReactElement> {
  const topData = await fetchTopHomeData();
  const { heroBanner } = topData;
  const hp = STRINGS.homepage as unknown as Record<string, string>;

  return (
    <main className="mx-auto w-full max-w-[767px] overflow-hidden">
      <div className="mx-auto w-full max-w-[767px]">
        <ExhibitionBanner banner={heroBanner} />
        <QuickMenu labels={STRINGS.quickMenu as never} />
        <BannerRow hp={hp} />
        <AsyncHomeBottom />
      </div>
    </main>
  );
}
