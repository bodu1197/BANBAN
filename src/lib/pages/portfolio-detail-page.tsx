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
    type ArtistReviewStats,
} from "@/lib/supabase/queries";
import { fetchArtistShopStats } from "@/lib/supabase/event-queries";
import type { ArtistShopCardData } from "@/components/shared/ArtistShopCard";
import { incrementPortfolioViews } from "@/lib/supabase/portfolio-view-tracking";
import { isPortfolioLiked } from "@/lib/actions/portfolio-likes";
import { PortfolioDetailClient } from "@/components/portfolio/PortfolioDetailClient";
import { PortfolioHeroBanner } from "@/components/portfolio/PortfolioHeroBanner";
import { PortfolioSecondarySection } from "@/components/portfolio/PortfolioSecondarySection";
import { PORTFOLIO_SECTION_IDS } from "@/components/portfolio/portfolio-section-ids";
import { getStorageUrl, getAvatarUrl } from "@/lib/supabase/storage-utils";
import { fetchBoostArtistIds, applyBoostGeneric } from "@/lib/supabase/boost-ranking";
import { parseDescriptionText } from "@/lib/text-utils";
import { STRINGS } from "@/lib/strings";
import { ImpressionZone } from "@/components/shared/ImpressionZone";
import type { ArtistType } from "@/types/database";

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
                preload
                fetchPriority="high"
            />
        </div>
    );
}

export async function generatePortfolioDetailMetadata(id: string): Promise<Metadata> {
    if (isLegacyNumericId(id)) {
        const uuid = await findPortfolioByLegacyId(Number(id));
        if (uuid) permanentRedirect(`/portfolios/${uuid}`);
        return {
            title: "포트폴리오를 찾을 수 없습니다 | 반언니",
            description: "요청하신 포트폴리오를 찾을 수 없습니다.",
            robots: { index: false, follow: false },
            ...buildPageSeo({
                title: "포트폴리오를 찾을 수 없습니다",
                description: "요청하신 포트폴리오를 찾을 수 없습니다.",
                path: `/portfolios/${id}`,
                image: null,
            }),
        };
    }

    const portfolio = await fetchPortfolioById(id);
    if (!portfolio) {
        return {
            title: "포트폴리오를 찾을 수 없습니다 | 반언니",
            description: "요청하신 포트폴리오를 찾을 수 없습니다.",
            robots: { index: false, follow: false },
            ...buildPageSeo({
                title: "포트폴리오를 찾을 수 없습니다",
                description: "요청하신 포트폴리오를 찾을 수 없습니다.",
                path: `/portfolios/${id}`,
                image: null,
            }),
        };
    }

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
    const boostIds = new Set(await fetchBoostArtistIds());
    const boost = <T extends { artist_id: string }>(items: T[]): T[] =>
        applyBoostGeneric(items, boostIds, (p) => p.artist_id);
    const boostedRandom = boost(randomPool);
    const boostedLower = boost(lowerPrice);
    const boostedHigher = boost(higherPrice);
    const boostedSameBody = boost(sameBodyPart);
    const otherCustomersViewed = boostedRandom.slice(0, 5);
    const styleSuggestions = boostedRandom.slice(5);

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
            recommendations={{ otherCustomersViewed, lowerPrice: boostedLower, higherPrice: boostedHigher, sameBodyPart: boostedSameBody, styleSuggestions }}
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
        { name: "홈", path: "/" },
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
    breadcrumbJsonLd: ReturnType<typeof getBreadcrumbJsonLd>;
    productJsonLd: ReturnType<typeof getProductJsonLd>;
}

function PageJsonLd({ breadcrumbJsonLd, productJsonLd }: Readonly<PageJsonLdProps>): React.ReactElement {
    return (
        <>
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

    const [shopStats] = await Promise.all([
        fetchArtistShopStats(portfolio.artist_id),
    ]);

    incrementPortfolioViews(id).catch(() => { /* non-fatal */ });
    portfolio.is_liked = isLiked;

    const firstImageUrl = getStorageUrl(portfolio.portfolio_media?.[0]?.storage_path ?? null);
    const heroMedia = buildHeroMedia(firstImageUrl, portfolio.title);

    const { breadcrumb: breadcrumbJsonLd, product: productJsonLd } = buildJsonLd(id, portfolio);
    const parsedDescription = parseDescriptionText(portfolio.description);
    const descriptionHtml = parsedDescription || STRINGS.portfolio.noDescription;
    const artistType = (portfolio.artist.type_artist ?? "SEMI_PERMANENT") as ArtistType;

    return (
        <main className="mx-auto min-h-screen max-w-[1024px] bg-background">
            <PageJsonLd breadcrumbJsonLd={breadcrumbJsonLd} productJsonLd={productJsonLd} />
            <PortfolioDetailClient
                portfolio={portfolio}
                firstImageUrl={firstImageUrl}
                heroMedia={heroMedia}
                descriptionHtml={descriptionHtml}
                heroBanner={buildHeroBanner(portfolio, reviewStats)}
                artistSection={
                    <section id={PORTFOLIO_SECTION_IDS.artist} aria-label="작가 정보 및 추천">
                        <ImpressionZone placement="portfolio-detail">
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
                        </ImpressionZone>
                    </section>
                }
            />
        </main>
    );
}
