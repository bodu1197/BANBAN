import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { fetchHomeData, type HomeData } from "@/lib/supabase/fetch-home-data";
import { fetchEyebrowPortfolios, fetchLipPortfolios, fetchMensEyebrowPortfolios, fetchTimeSalePortfolios } from "@/lib/supabase/home-portfolio-queries";
import dynamic from "next/dynamic";
import { QuickMenu } from "@/components/home/QuickMenu";
import { SectionHeader } from "@/components/home/SectionHeader";
import { SalePortfolioCard, RecruitmentCard, PopularArtistCard } from "@/components/home/cards";
import { AiBanner } from "@/components/home/AiBanner";
import { HorizontalScrollList } from "@/components/home/HorizontalScrollList";
import { BeautySimBanner } from "@/components/home/BeautySimBanner";
import { ExhibitionBanner } from "@/components/home/ExhibitionBanner";
import { ExhibitionSection } from "@/components/home/ExhibitionSection";
import { QuoteRequestBanner } from "@/components/home/QuoteRequestBanner";
import { TimeSaleSection } from "@/components/home/TimeSaleSection";
import type { HomePortfolio, HomeRecruitment, HomeArtist } from "@/lib/supabase/home-queries";
import { fetchActiveBanner } from "@/lib/supabase/banner-queries";
import { secureShuffle } from "@/lib/random";
import { fetchExhibitions } from "@/lib/supabase/exhibition-queries";
import { fetchExhibitionEntries, type ExhibitionEntryWithDetails } from "@/lib/supabase/exhibition-entry-queries";
import { fetchActiveArtists } from "@/lib/supabase/home-artist-queries";
import { fetchTattooGenres, fetchGenrePortfolios, type TattooGenre } from "@/lib/supabase/home-genre-queries";
import { LazyHomeSection } from "@/components/home/LazyHomeSection";

const TattooGenreSection = dynamic(() => import("@/components/home/TattooGenreSection").then(m => m.TattooGenreSection));



export async function generateHomeMetadata(): Promise<Metadata> {
  const title = "타투어때 - 타투 가격비교 & 타투이스트 추천 | 대한민국 1등 타투 플랫폼";
  const description = "타투 잘하는 곳 찾을 땐 타투어때! 전국 타투샵 가격비교, 타투이스트 포트폴리오, 반영구·레터링·감성타투까지. 200만 회원이 선택한 대한민국 최대 타투 플랫폼.";

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    alternates: getAlternates("/"),
  };
}

/** Merge two arrays and deduplicate by id */
function mergeById<T extends { id: string }>(a: T[], b: T[], limit: number): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of [...a, ...b]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
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

function RecruitmentSection({ items, title, moreLink, moreText }: Readonly<{
  items: HomeRecruitment[];
  title: string;
  moreLink: string;
  moreText?: string;
}>): React.ReactElement | null {
  if (items.length === 0) return null;
  return (
    <section className="py-4">
      <SectionHeader title={title} moreLink={moreLink} moreText={moreText} />
      <HorizontalScrollList>
        {items.map((r) => (
          <RecruitmentCard key={r.id} recruitment={r} />
        ))}
      </HorizontalScrollList>
    </section>
  );
}

interface SectionLocaleProps {
  hp: Record<string, string>;
  common: Record<string, string>;
}

function DiscoverSections({ hp, eyebrowPortfolios, exhibitionEntries, exhibitionTitle, exhibitionLink, genres, genrePortfolios }: Readonly<
  SectionLocaleProps & {
    eyebrowPortfolios: HomePortfolio[];
    exhibitionEntries: ExhibitionEntryWithDetails[];
    exhibitionTitle: string;
    exhibitionLink: string;
    genres: TattooGenre[];
    genrePortfolios: HomePortfolio[];
  }
>): React.ReactElement {
  return (
    <>
      <ExhibitionSection
        entries={exhibitionEntries}
        title={exhibitionTitle}
        moreLink={exhibitionLink}
        moreText={hp.seeMore}
      />
      <ScrollSection
        items={eyebrowPortfolios}
        title={hp.eyebrowSection}
        moreLink="/women-beauty"
        keyPrefix="eyebrow-"
        moreText={hp.seeMore}
      />
      <BeautySimBanner />
      <TattooGenreSection
        genres={genres}
        initialPortfolios={genrePortfolios}
        title={hp.tattooGenres}
      />
    </>
  );
}

function CategorySections({ hp, recruitments, touchupEntries, lipPortfolios, mensEyebrowPortfolios }: Readonly<
  SectionLocaleProps & {
    recruitments: HomeRecruitment[];
    touchupEntries: ExhibitionEntryWithDetails[];
    lipPortfolios: HomePortfolio[];
    mensEyebrowPortfolios: HomePortfolio[];
  }
>): React.ReactElement {
  return (
    <>
      <ExhibitionSection
        entries={touchupEntries}
        title={hp.touchupSection}
        moreLink="/exhibition/f77e33c6-89ec-461a-a9d5-638df14bcf8a"
        moreText={hp.seeMore}
      />
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
      <RecruitmentSection
        items={recruitments}
        title={hp.modelRecruitment}
        moreLink="/recruitment"
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

function CuratedExhibitions({ hp, indieEntries, butlerEntries, activeArtists }: Readonly<{
  hp: Record<string, string>;
  indieEntries: ExhibitionEntryWithDetails[];
  butlerEntries: ExhibitionEntryWithDetails[];
  activeArtists: HomeArtist[];
}>): React.ReactElement {
  return (
    <>
      <ExhibitionSection
        entries={indieEntries}
        title={hp.indieDesign}
        moreLink="/exhibition/507469c7-7fbf-4846-b80c-c38cf36aa9fb"
        moreText={hp.seeMore}
      />
      <ExhibitionSection
        entries={butlerEntries}
        title={hp.butlerSection}
        moreLink="/exhibition/5dd684b8-7296-47f2-83aa-e387981c72f3"
        moreText={hp.seeMore}
      />
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

function ServiceBannerRow({ hp }: Readonly<{ hp: Record<string, string> }>): React.ReactElement {
  return (
    <div className="px-4 py-1">
      <QuoteRequestBanner title={hp.quoteRequestTitle} desc={hp.quoteRequestDesc} badge={hp.quoteRequestBadge} />
    </div>
  );
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

const EMPTY_HOME_DATA: HomeData = { artists: [], lowest: [], popular: [], recruitments: [] };

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function fetchTopHomeData() {
  const heroBanner = await safe(() => fetchActiveBanner(), null);
  return { heroBanner };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function fetchBottomHomeData() {
  const [timeSalePortfolios, tattooData, beautyData, exhibitions, eyebrowPortfolios, genres, lipPortfolios, activeArtists, mensEyebrowPortfolios] = await Promise.all([
    safe(() => fetchTimeSalePortfolios(10), []),
    safe(() => fetchHomeData("TATTOO"), EMPTY_HOME_DATA),
    safe(() => fetchHomeData("SEMI_PERMANENT"), EMPTY_HOME_DATA),
    safe(() => fetchExhibitions(), []),
    safe(() => fetchEyebrowPortfolios(10), []),
    safe(() => fetchTattooGenres(), []),
    safe(() => fetchLipPortfolios(10), []),
    safe(() => fetchActiveArtists(10), []),
    safe(() => fetchMensEyebrowPortfolios(10), []),
  ]);

  const firstExhibition = exhibitions[0] ?? null;
  const TOUCHUP_EXHIBITION_ID = "f77e33c6-89ec-461a-a9d5-638df14bcf8a";
  const INDIE_EXHIBITION_ID = "507469c7-7fbf-4846-b80c-c38cf36aa9fb";
  const BUTLER_EXHIBITION_ID = "5dd684b8-7296-47f2-83aa-e387981c72f3";
  const firstGenreId = genres[0]?.id;
  const HOME_EXHIBITION_LIMIT = 10;
  const [rawEntries, rawTouchupEntries, rawIndieEntries, rawButlerEntries, genrePortfolios] = await Promise.all([
    firstExhibition ? safe(() => fetchExhibitionEntries(firstExhibition.id, HOME_EXHIBITION_LIMIT), []) : Promise.resolve([]),
    safe(() => fetchExhibitionEntries(TOUCHUP_EXHIBITION_ID, HOME_EXHIBITION_LIMIT), []),
    safe(() => fetchExhibitionEntries(INDIE_EXHIBITION_ID, HOME_EXHIBITION_LIMIT), []),
    safe(() => fetchExhibitionEntries(BUTLER_EXHIBITION_ID, HOME_EXHIBITION_LIMIT), []),
    firstGenreId ? safe(() => fetchGenrePortfolios(firstGenreId, 10), []) : Promise.resolve([]),
  ]);

  const exhibitionEntries = secureShuffle(rawEntries);
  const touchupEntries = secureShuffle(rawTouchupEntries);
  const indieEntries = secureShuffle(rawIndieEntries);
  const butlerEntries = secureShuffle(rawButlerEntries);

  return { timeSalePortfolios, tattooData, beautyData, firstExhibition, exhibitionEntries, eyebrowPortfolios, touchupEntries, genres, genrePortfolios, lipPortfolios, indieEntries, butlerEntries, activeArtists, mensEyebrowPortfolios };
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
    exhibitionEntries: ExhibitionEntryWithDetails[];
    genres: TattooGenre[];
    genrePortfolios: HomePortfolio[];
    firstExhibition?: { id: string; title: string } | null;
  };
}>): React.ReactElement {
  const { eyebrowPortfolios, exhibitionEntries, genres, genrePortfolios, firstExhibition } = homeData;
  return (
    <LazyHomeSection>
      <DiscoverSections
        hp={hp}
        common={common}
        eyebrowPortfolios={eyebrowPortfolios}
        exhibitionEntries={exhibitionEntries}
        exhibitionTitle={firstExhibition?.title ?? hp.exhibition}
        exhibitionLink={firstExhibition ? `/exhibition/${firstExhibition.id}` : "/exhibition"}
        genres={genres}
        genrePortfolios={genrePortfolios}
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
    tattooData: { recruitments: HomeRecruitment[] };
    beautyData: { recruitments: HomeRecruitment[] };
    touchupEntries: ExhibitionEntryWithDetails[];
    lipPortfolios: HomePortfolio[];
    mensEyebrowPortfolios: HomePortfolio[];
  };
}>): React.ReactElement {
  const { tattooData, beautyData, touchupEntries, lipPortfolios, mensEyebrowPortfolios } = homeData;
  return (
    <LazyHomeSection>
      <CategorySections
        hp={hp}
        common={common}
        recruitments={mergeById(tattooData.recruitments, beautyData.recruitments, 10)}
        touchupEntries={touchupEntries}
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
        <CuratedExhibitions hp={hp} indieEntries={homeData.indieEntries} butlerEntries={homeData.butlerEntries} activeArtists={homeData.activeArtists} />
      </LazyHomeSection>
      <ServiceBannerRow hp={hp} />
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
