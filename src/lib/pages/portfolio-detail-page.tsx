import { Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { buildPageSeo, getBreadcrumbJsonLd, getProductJsonLd, getCanonicalUrl, jsonLdSafe } from "@/lib/seo";
import { isLegacyNumericId, findPortfolioByLegacyId } from "@/lib/supabase/legacy-redirect";
import {
    fetchPortfolioById,
    fetchPortfoliosByArtist,
    fetchLowerPricePortfolios,
    fetchHigherPricePortfolios,
    fetchRandomPortfolios,
    fetchSameCategoryPortfolios,
    fetchArtistReviewStats,
    fetchReviewsByArtist,
    fetchBeforeAfterByArtist,
    fetchArtistById,
    getArtistMediaUrl,
    type ArtistReviewStats,
} from "@/lib/supabase/queries";
import { fetchArtistShopStats, fetchEventsByArtist } from "@/lib/supabase/event-queries";
import { ArtistShopTabs } from "@/components/artists/ArtistShopTabs";
import { ShopHeroBanner } from "@/components/artists/ShopHeroBanner";
import type { ArtistShopCardData } from "@/components/shared/ArtistShopCard";
import { incrementPortfolioViews } from "@/lib/supabase/portfolio-view-tracking";
import { isPortfolioLiked } from "@/lib/actions/portfolio-likes";
import { PortfolioDetailClient } from "@/components/portfolio/PortfolioDetailClient";
import { PortfolioHeroBanner } from "@/components/portfolio/PortfolioHeroBanner";
import { PortfolioSecondarySection } from "@/components/portfolio/PortfolioSecondarySection";
import { PORTFOLIO_SECTION_IDS } from "@/components/portfolio/portfolio-section-ids";
import { getStorageUrl, getAvatarUrl } from "@/lib/supabase/storage-utils";
import { parseDescriptionText } from "@/lib/text-utils";
import { STRINGS } from "@/lib/strings";
import { fetchLikedArtistIds } from "@/lib/actions/likes";
import type { ArtistType } from "@/types/database";

const DEFAULT_SHOP_BANNERS = [
    "/images/defaults/shop-banner-1.jpg",
    "/images/defaults/shop-banner-2.jpg",
];

function buildHeroMedia(url: string | null, title: string): React.ReactElement | null {
    if (!url) return null;
    return (
        <div className="relative aspect-square w-full bg-black">
            <Image
                src={url}
                alt={title}
                fill
                sizes="(max-width: 767px) 100vw, 767px"
                quality={65}
                className="object-cover"
                priority
                fetchPriority="high"
            />
        </div>
    );
}

export async function generatePortfolioDetailMetadata(id: string): Promise<Metadata> {
    if (isLegacyNumericId(id)) {
        const uuid = await findPortfolioByLegacyId(Number(id));
        if (uuid) permanentRedirect(`/portfolios/${uuid}`);
        return { title: "Portfolio Not Found" };
    }

    const portfolio = await fetchPortfolioById(id);
    if (!portfolio) return { title: "Portfolio Not Found" };

    const title = portfolio.title;
    const description = portfolio.description?.slice(0, 160) || `${portfolio.artist.title} 반영구 작품 — 가격, 시술 정보, 후기를 확인하세요.`;
    const firstImage = getStorageUrl(portfolio.portfolio_media?.[0]?.storage_path ?? null);

    return {
        title,
        description,
        ...buildPageSeo({
            title,
            description,
            path: `/portfolios/${id}`,
            image: firstImage,
        }),
    };
}

async function handleLegacyRedirect(id: string): Promise<void> {
    if (!isLegacyNumericId(id)) return;
    const uuid = await findPortfolioByLegacyId(Number(id));
    if (uuid) permanentRedirect(`/portfolios/${uuid}`);
    notFound();
}

async function StreamedSecondaryData({ id, artistId, artistType, price, artist, reviewStats }: Readonly<{
    id: string;
    artistId: string;
    artistType: ArtistType;
    price: number;
    artist: {
        id: string;
        title: string;
        profile_image_path: string | null;
        address: string;
        region?: { name: string } | null;
    };
    reviewStats: ArtistReviewStats;
}>): Promise<React.ReactElement> {
    const [
        { data: artistPortfolios, count: artistPortfolioCount },
        randomPool, lowerPrice, higherPrice, sameBodyPart,
        shopStats,
    ] = await Promise.all([
        fetchPortfoliosByArtist(artistId, { limit: 10 }),
        fetchRandomPortfolios(id, artistType, 10),
        fetchLowerPricePortfolios(price, id, artistType, 5),
        fetchHigherPricePortfolios(price, id, artistType, 5),
        fetchSameCategoryPortfolios(id, artistType, 5),
        fetchArtistShopStats(artistId),
    ]);
    const otherCustomersViewed = randomPool.slice(0, 5);
    const styleSuggestions = randomPool.slice(5);

    const shopCardData: ArtistShopCardData = {
        artistId: artist.id,
        artistName: artist.title,
        artistAvatar: getAvatarUrl(artist.profile_image_path),
        address: artist.region?.name ?? artist.address ?? "",
        avgRating: reviewStats.avgRating,
        reviewCount: reviewStats.reviewCount,
        eventCount: shopStats.eventCount,
        portfolioCount: shopStats.portfolioCount,
    };

    return (
        <PortfolioSecondarySection
            artist={artist}
            artistPortfolios={artistPortfolios.filter(p => p.id !== id)}
            artistPortfolioCount={artistPortfolioCount}
            shopStats={shopCardData}
            recommendations={{ otherCustomersViewed, lowerPrice, higherPrice, sameBodyPart, styleSuggestions }}
        />
    );
}

function RecommendationsSkeleton(): React.ReactElement {
    return (
        <div className="space-y-6 px-4 py-6">
            {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                    <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                    <div className="flex gap-3 overflow-hidden">
                        {[1, 2, 3, 4].map((j) => (
                            <div key={j} className="w-32 shrink-0 space-y-2">
                                <div className="aspect-square w-full animate-pulse rounded-lg bg-muted" />
                                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function buildJsonLd(
    id: string,
    portfolio: NonNullable<Awaited<ReturnType<typeof fetchPortfolioById>>>,
): { breadcrumb: ReturnType<typeof getBreadcrumbJsonLd>; product: ReturnType<typeof getProductJsonLd> } {
    const breadcrumb = getBreadcrumbJsonLd([
        { name: "홈", path: "" },
        { name: "포트폴리오", path: "/portfolios" },
        { name: portfolio.title, path: `/portfolios/${id}` },
    ]);
    const productImages = (portfolio.portfolio_media ?? [])
        .map((m) => getStorageUrl(m.storage_path))
        .filter((u): u is string => Boolean(u));
    const product = getProductJsonLd({
        name: portfolio.title,
        description: portfolio.description?.slice(0, 500) ?? `${portfolio.artist.title} 반영구 작품`,
        image: productImages,
        url: getCanonicalUrl(`/portfolios/${id}`),
        price: portfolio.price,
        brandName: portfolio.artist.title,
        category: "반영구 화장",
    });
    return { breadcrumb, product };
}

function buildHeroBanner(
    portfolio: NonNullable<Awaited<ReturnType<typeof fetchPortfolioById>>>,
    reviewStats: ArtistReviewStats,
): React.ReactElement {
    const artist = {
        id: portfolio.artist_id,
        name: portfolio.artist.title,
        avatar: getAvatarUrl(portfolio.artist.profile_image_path),
        address: portfolio.artist.region?.name ?? portfolio.artist.address ?? "",
    };
    return (
        <PortfolioHeroBanner
            artist={artist}
            title={portfolio.title}
            avgRating={reviewStats.avgRating}
            reviewCount={reviewStats.reviewCount}
            price={portfolio.price}
            priceOrigin={portfolio.price_origin}
            discountRate={portfolio.discount_rate}
        />
    );
}

interface PageJsonLdProps {
    preloadUrl: string | null;
    breadcrumbJsonLd: ReturnType<typeof getBreadcrumbJsonLd>;
    productJsonLd: ReturnType<typeof getProductJsonLd>;
}

function PageJsonLd({ preloadUrl, breadcrumbJsonLd, productJsonLd }: Readonly<PageJsonLdProps>): React.ReactElement {
    return (
        <>
            {preloadUrl ? (
                <link rel="preload" as="image" href={preloadUrl} fetchPriority="high" />
            ) : null}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdSafe(productJsonLd) }}
            />
        </>
    );
}

export async function renderPortfolioDetailPage(id: string): Promise<React.ReactElement> {
    await handleLegacyRedirect(id);

    const portfolioPromise = fetchPortfolioById(id);
    const reviewStatsPromise: Promise<ArtistReviewStats> = portfolioPromise.then((p) =>
        p ? fetchArtistReviewStats(p.artist_id) : { avgRating: 0, reviewCount: 0 },
    );
    const [portfolio, isLiked, reviewStats] = await Promise.all([
        portfolioPromise,
        isPortfolioLiked(id),
        reviewStatsPromise,
    ]);

    if (!portfolio) notFound();

    const [artistEvents, { data: artistPortfolios }, { data: artistReviews }, artistBeforeAfter, artist, likedArtistIds] = await Promise.all([
        fetchEventsByArtist(portfolio.artist_id),
        fetchPortfoliosByArtist(portfolio.artist_id, { limit: 50 }),
        fetchReviewsByArtist(portfolio.artist_id),
        fetchBeforeAfterByArtist(portfolio.artist_id),
        fetchArtistById(portfolio.artist_id),
        fetchLikedArtistIds(),
    ]);

    incrementPortfolioViews(id).catch(() => { /* non-fatal */ });
    portfolio.is_liked = isLiked;

    const firstImageUrl = getStorageUrl(portfolio.portfolio_media?.[0]?.storage_path ?? null);
    const heroMedia = buildHeroMedia(firstImageUrl, portfolio.title);
    const preloadUrl = firstImageUrl
        ? `/_next/image?url=${encodeURIComponent(firstImageUrl)}&w=828&q=65`
        : null;

    const { breadcrumb: breadcrumbJsonLd, product: productJsonLd } = buildJsonLd(id, portfolio);
    const parsedDescription = parseDescriptionText(portfolio.description);
    const descriptionHtml = parsedDescription || STRINGS.portfolio.noDescription;
    const artistType = (portfolio.artist.type_artist ?? "SEMI_PERMANENT") as ArtistType;

    return (
        <main className="mx-auto min-h-screen max-w-[1024px] bg-background">
            <PageJsonLd preloadUrl={preloadUrl} breadcrumbJsonLd={breadcrumbJsonLd} productJsonLd={productJsonLd} />
            <PortfolioDetailClient
                portfolio={portfolio}
                firstImageUrl={firstImageUrl}
                heroMedia={heroMedia}
                descriptionHtml={descriptionHtml}
                heroBanner={buildHeroBanner(portfolio, reviewStats)}
                artistSection={
                    <section id={PORTFOLIO_SECTION_IDS.artist} aria-label="작가 정보 및 추천">
                        <Suspense fallback={<RecommendationsSkeleton />}>
                            <StreamedSecondaryData
                                id={id}
                                artistId={portfolio.artist_id}
                                artistType={artistType}
                                price={portfolio.price ?? 0}
                                artist={portfolio.artist}
                                reviewStats={reviewStats}
                            />
                        </Suspense>
                    </section>
                }
                shopTabs={
                    <ArtistShopTabs
                        events={artistEvents}
                        portfolios={artistPortfolios}
                        reviews={artistReviews}
                        beforeAfterPhotos={artistBeforeAfter}
                        eventCount={artistEvents.length}
                        portfolioCount={artistPortfolios.length}
                        beforeAfterCount={artistBeforeAfter.length}
                        reviewCount={artistReviews.length}
                        artistId={portfolio.artist_id}
                        isLoggedIn={isLiked !== undefined}
                        stickyTopClass="top-[61px]"
                        homeContent={artist ? (
                            <ShopHeroBanner
                                shop={artist}
                                heroImages={
                                    artist.artist_media?.length
                                        ? [...artist.artist_media].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map((m) => getArtistMediaUrl(m.storage_path)).filter((u): u is string => Boolean(u))
                                        : DEFAULT_SHOP_BANNERS
                                }
                                reviewCount={reviewStats.reviewCount}
                                avgRating={reviewStats.avgRating}
                                isLiked={likedArtistIds.includes(portfolio.artist_id)}
                            />
                        ) : null}
                    />
                }
            />
        </main>
    );
}
