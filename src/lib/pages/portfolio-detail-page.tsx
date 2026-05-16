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
} from "@/lib/supabase/queries";
import { incrementPortfolioViews } from "@/lib/supabase/portfolio-view-tracking";
import { isPortfolioLiked } from "@/lib/actions/portfolio-likes";
import { PortfolioDetailClient } from "@/components/portfolio/PortfolioDetailClient";
import { PortfolioSecondarySection } from "@/components/portfolio/PortfolioSecondarySection";
import { getStorageUrl } from "@/lib/supabase/storage-utils";
import { parseDescriptionText } from "@/lib/text-utils";
import { STRINGS } from "@/lib/strings";
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

async function StreamedSecondaryData({ id, artistId, artistType, price, artist }: Readonly<{
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
}>): Promise<React.ReactElement> {
    const [
        { data: artistPortfolios, count: artistPortfolioCount },
        otherCustomersViewed, lowerPrice, higherPrice, sameBodyPart, styleSuggestions,
    ] = await Promise.all([
        fetchPortfoliosByArtist(artistId, { limit: 10 }),
        fetchRandomPortfolios(id, artistType, 5),
        fetchLowerPricePortfolios(price, id, artistType, 5),
        fetchHigherPricePortfolios(price, id, artistType, 5),
        fetchSameCategoryPortfolios(id, artistType, 5),
        fetchRandomPortfolios(id, artistType, 5),
    ]);

    return (
        <PortfolioSecondarySection
            artist={artist}
            artistPortfolios={artistPortfolios.filter(p => p.id !== id)}
            artistPortfolioCount={artistPortfolioCount}
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

export async function renderPortfolioDetailPage(id: string): Promise<React.ReactElement> {
    await handleLegacyRedirect(id);

    const [portfolio, isLiked] = await Promise.all([
        fetchPortfolioById(id),
        isPortfolioLiked(id),
    ]);

    if (!portfolio) notFound();

    incrementPortfolioViews(id).catch(() => { /* non-fatal */ });
    portfolio.is_liked = isLiked;

    const firstImageUrl = getStorageUrl(portfolio.portfolio_media?.[0]?.storage_path ?? null);
    const heroMedia = buildHeroMedia(firstImageUrl, portfolio.title);
    const preloadUrl = firstImageUrl
        ? `/_next/image?url=${encodeURIComponent(firstImageUrl)}&w=828&q=65`
        : null;

    const breadcrumbJsonLd = getBreadcrumbJsonLd([
        { name: "홈", path: "" },
        { name: "포트폴리오", path: "/portfolios" },
        { name: portfolio.title, path: `/portfolios/${id}` },
    ]);

    const productImages = (portfolio.portfolio_media ?? [])
        .map((m) => getStorageUrl(m.storage_path))
        .filter((u): u is string => Boolean(u));
    const productJsonLd = getProductJsonLd({
        name: portfolio.title,
        description: portfolio.description?.slice(0, 500) ?? `${portfolio.artist.title} 반영구 작품`,
        image: productImages,
        url: getCanonicalUrl(`/portfolios/${id}`),
        price: portfolio.price,
        brandName: portfolio.artist.title,
        category: "반영구 화장",
    });

    const parsedDescription = parseDescriptionText(portfolio.description);
    const descriptionHtml = parsedDescription || STRINGS.portfolio.noDescription;
    const artistType = (portfolio.artist.type_artist ?? "SEMI_PERMANENT") as ArtistType;

    return (
        <main className="mx-auto min-h-screen max-w-[767px] bg-background">
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
            <PortfolioDetailClient
                portfolio={portfolio}
                firstImageUrl={firstImageUrl}
                heroMedia={heroMedia}
                descriptionHtml={descriptionHtml}
            />
            <Suspense fallback={<RecommendationsSkeleton />}>
                <StreamedSecondaryData
                    id={id}
                    artistId={portfolio.artist_id}
                    artistType={artistType}
                    price={portfolio.price ?? 0}
                    artist={portfolio.artist}
                />
            </Suspense>
        </main>
    );
}
