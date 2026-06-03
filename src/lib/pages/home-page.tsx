import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { STRINGS } from "@/lib/strings";
import { buildPageSeo, getOrganizationJsonLd, jsonLdSafe } from "@/lib/seo";
import { fetchEyebrowPortfolios, fetchLipPortfolios, fetchMensEyebrowPortfolios, fetchTimeSalePortfolios } from "@/lib/supabase/home-portfolio-queries";
import { fetchPopularEvents } from "@/lib/supabase/event-queries";
import {
  EXHIBITION_CATEGORY_COLORS,
  EXHIBITION_CATEGORY_LABELS,
  fetchExhibitions,
  type ExhibitionItem,
} from "@/lib/supabase/exhibition-queries";
import { PromoBannerGrid } from "@/components/home/PromoBannerGrid";
import { SectionHeader } from "@/components/home/SectionHeader";
import { SalePortfolioCard } from "@/components/home/cards";
import { SUPABASE_URL } from "@/lib/supabase/config";
import Image from "next/image";
import Link from "next/link";
import { HorizontalScrollList } from "@/components/home/HorizontalScrollList";
import { QuickMenu } from "@/components/home/QuickMenu";
import { TimeSaleSection } from "@/components/home/TimeSaleSection";
import type { HomePortfolio } from "@/lib/supabase/home-queries";
import { fetchPromoBanners, fetchQuickMenuItems } from "@/lib/supabase/banner-queries";
import { LazyHomeSection } from "@/components/home/LazyHomeSection";
import { HomeSearchTrigger } from "@/components/home/HomeSearchTrigger";
import { HomePopularKeywords } from "@/components/home/HomePopularKeywords";
import { HomeHeroBanner } from "@/components/home/HomeHeroBanner";
import { fetchHeroBanners } from "@/lib/supabase/hero-banner-queries";
import { AiTestPromoBanner } from "@/components/home/AiTestPromoBanner";
import { PopularEventsList } from "@/components/home/PopularEventsList";

const ImpressionZone = dynamic(() => import("@/components/shared/ImpressionZone").then(m => m.ImpressionZone));

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

function HomeExhibitionCard({ item }: Readonly<{ item: ExhibitionItem }>): React.ReactElement {
  const src = item.image_path.startsWith("http")
    ? item.image_path
    : `${SUPABASE_URL}/storage/v1/object/public/portfolios/${item.image_path}`;
  const catLabel = EXHIBITION_CATEGORY_LABELS[item.category] ?? item.category;
  const catBg = EXHIBITION_CATEGORY_COLORS[item.category] ?? "bg-zinc-500/80";
  return (
    <Link
      href={`/exhibition/${item.id}`}
      className="group relative block w-[160px] shrink-0 overflow-hidden rounded-xl shadow-md transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring snap-start md:w-[200px] lg:w-[230px]"
    >
      <div className="relative aspect-[4/3]">
        <Image
          src={src}
          alt={item.title}
          fill
          sizes="(max-width: 767px) 160px, (max-width: 1023px) 200px, 230px"
          className="object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm ${catBg}`}>
          {catLabel}
        </span>
        <div className="absolute inset-x-2 bottom-2">
          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-white drop-shadow">{item.title}</h3>
        </div>
      </div>
    </Link>
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
      <HorizontalScrollList className="flex gap-3 py-1">
        {items.map((item) => (
          <HomeExhibitionCard key={item.id} item={item} />
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
  const [promoBanners, quickMenuItems, popularEvents] = await Promise.all([
    safe(() => fetchPromoBanners(), []),
    safe(() => fetchQuickMenuItems(), []),
    safe(() => fetchPopularEvents(30), []),
  ]);
  return { promoBanners, quickMenuItems, popularEvents };
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

const APP_STORE_URL = "https://apps.apple.com/us/app/%EB%B0%98%EC%96%B8%EB%8B%88-%EB%88%88%EC%8D%B9%EB%AC%B8%EC%8B%A0-%EB%B0%98%EC%98%81%EA%B5%AC-%EA%B0%80%EA%B2%A9%EB%B9%84%EA%B5%90-%EB%B0%8F-%EA%B0%84%ED%8E%B8-%EC%98%88%EC%95%BD/id6762251420";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.swing2app.v3.da2371fb31eee407fb0e926e1fe9a607e&hl=ko";

function AppDownloadSection(): React.ReactElement {
  const linkClass = "flex items-center justify-center gap-2.5 rounded-xl border border-border bg-background px-5 py-3 text-foreground shadow-sm transition-all hover:shadow-md hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-1";
  return (
    <section aria-label="앱 다운로드" className="px-4 py-8">
      <div className="flex flex-col justify-center gap-2.5 sm:flex-row">
        <Link
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="App Store 에서 반언니 다운로드"
          className={linkClass}
        >
          <svg width="24" height="24" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
          </svg>
          <div className="text-left leading-tight">
            <p className="text-[10px] text-muted-foreground">Download on the</p>
            <p className="text-base font-bold">App Store</p>
          </div>
        </Link>
        <Link
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Google Play 에서 반언니 다운로드"
          className={linkClass}
        >
          <svg width="24" height="24" viewBox="0 0 512 512" aria-hidden="true">
            <path fill="#34A853" d="M325.3 234.3 104.6 13l280.8 161.2-60.1 60.1z" />
            <path fill="#FBBC04" d="m104.6 499 220.7-220.7 60.1 60.1L104.6 499z" />
            <path fill="#4285F4" d="M483.7 227.6c14.4 8.5 14.4 35 0 43.5l-98.9 56.6-65.5-65.5 65.5-65.5 98.9 30.9z" />
            <path fill="#EA4335" d="m104.6 13 220.7 220.7-220.7 220.7c-7.6-3.4-12.6-11-12.6-20V33c0-9 5-16.6 12.6-20z" />
          </svg>
          <div className="text-left leading-tight">
            <p className="text-[10px] text-muted-foreground">GET IT ON</p>
            <p className="text-base font-bold">Google Play</p>
          </div>
        </Link>
      </div>
    </section>
  );
}

async function AsyncHomeBottom(): Promise<React.ReactElement> {
  const homeData = await fetchBottomHomeData();
  const hp = STRINGS.homepage as unknown as Record<string, string>;
  const common = STRINGS.common as unknown as Record<string, string>;

  return (
    <>
      <LazyHomeSection size="md">
        <CuratedExhibitions hp={hp} exhibitions={homeData.exhibitions} />
      </LazyHomeSection>
      <TimeSaleSection
        items={homeData.timeSalePortfolios}
        title={hp.timeSaleSection}
        moreLink="/discount"
        moreText={hp.seeMore}
      />
      <HomeDiscoverySections hp={hp} common={common} homeData={homeData} />
      <HomeCategorySections hp={hp} common={common} homeData={homeData} />
      <AppDownloadSection />
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
  const { promoBanners, quickMenuItems, popularEvents } = topData;

  const organizationJsonLd = getOrganizationJsonLd();

  return (
    <main className="mx-auto w-full max-w-[1024px] overflow-hidden">
      {/* SEO/접근성: 페이지 단일 h1 (디자인 영향 없이 스크린리더·검색엔진용) */}
      <h1 className="sr-only">반언니 — 반영구 화장 가격비교 &amp; 아티스트 추천 플랫폼</h1>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(organizationJsonLd) }}
      />
      <ImpressionZone placement="home" className="mx-auto w-full max-w-[1024px]">
        {/* 바비톡 패턴 순서: 검색바 → 인기검색어 → 히어로 캐러셀 → 퀵메뉴 → ... */}
        <HomeSearchTrigger />
        <HomePopularKeywords />
        <HomeHeroBanner banner={heroBanners[0] ?? null} />
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
              <PopularEventsList events={popularEvents} />
            </HorizontalScrollList>
          </section>
        )}
        <PromoBannerGrid banners={promoBanners} />
        <Suspense fallback={<HomeBottomSkeleton />}>
          <AsyncHomeBottom />
        </Suspense>
      </ImpressionZone>
    </main>
  );
}
