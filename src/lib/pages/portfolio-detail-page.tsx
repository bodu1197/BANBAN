import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { getAlternates, getBreadcrumbJsonLd } from "@/lib/seo";
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
import { getStorageUrl } from "@/lib/supabase/storage-utils";
import { parseDescriptionText } from "@/lib/text-utils";
import { STRINGS } from "@/lib/strings";

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
    // Legacy numeric ID → 301 redirect to UUID URL
    if (isLegacyNumericId(id)) {
        const uuid = await findPortfolioByLegacyId(Number(id));
        if (uuid) {
            permanentRedirect(`/portfolios/${uuid}`);
        }
        return { title: "Portfolio Not Found" };
    }

    const portfolio = await fetchPortfolioById(id);

    if (!portfolio) {
        return { title: "Portfolio Not Found" };
    }

    return {
        title: portfolio.title,
        description: portfolio.description?.slice(0, 160) || `Portfolio by ${portfolio.artist.title}`,
        openGraph: {
            images: portfolio.portfolio_media?.[0]?.storage_path ? [portfolio.portfolio_media[0].storage_path] : [],
        },
        alternates: getAlternates(`/portfolios/${id}`),
    };
}

async function handleLegacyRedirect(id: string): Promise<void> {
    if (!isLegacyNumericId(id)) return;
    const uuid = await findPortfolioByLegacyId(Number(id));
    if (uuid) permanentRedirect(`/portfolios/${uuid}`);
    notFound();
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function fetchSecondaryData(id: string, portfolio: NonNullable<Awaited<ReturnType<typeof fetchPortfolioById>>>) {
    const artistType = portfolio.artist.type_artist ?? "TATTOO";
    const [
        isLiked,
        { data: artistPortfolios, count: artistPortfolioCount },
        otherCustomersViewed, lowerPrice, higherPrice, sameBodyPart, styleSuggestions,
    ] = await Promise.all([
        isPortfolioLiked(id),
        fetchPortfoliosByArtist(portfolio.artist_id, { limit: 10 }),
        fetchRandomPortfolios(id, artistType, 5),
        fetchLowerPricePortfolios(portfolio.price ?? 0, id, artistType, 5),
        fetchHigherPricePortfolios(portfolio.price ?? 0, id, artistType, 5),
        fetchSameCategoryPortfolios(id, artistType, 5),
        fetchRandomPortfolios(id, artistType, 5),
    ]);
    return {
        isLiked,
        artistPortfolios: artistPortfolios.filter(p => p.id !== id),
        artistPortfolioCount,
        recommendations: { otherCustomersViewed, lowerPrice, higherPrice, sameBodyPart, styleSuggestions },
    };
}

export async function renderPortfolioDetailPage(id: string): Promise<React.ReactElement> {
    await handleLegacyRedirect(id);

    const portfolio = await fetchPortfolioById(id);

    if (!portfolio) notFound();

    incrementPortfolioViews(id).catch(() => { /* non-fatal */ });

    const { isLiked, artistPortfolios: filteredArtistPortfolios, artistPortfolioCount, recommendations } = await fetchSecondaryData(id, portfolio);
    portfolio.is_liked = isLiked;

    // Extract first media URL for server-side LCP rendering
    const firstImageUrl = getStorageUrl(portfolio.portfolio_media?.[0]?.storage_path ?? null);
    const heroMedia = buildHeroMedia(firstImageUrl, portfolio.title);

    // Preload LCP image in <head> to eliminate resource load delay (~1.4s saving)
    const preloadUrl = firstImageUrl
        ? `/_next/image?url=${encodeURIComponent(firstImageUrl)}&w=828&q=65`
        : null;

    const breadcrumbJsonLd = getBreadcrumbJsonLd([
        { name: "홈", path: "" },
        { name: "포트폴리오", path: "/portfolios" },
        { name: portfolio.title, path: `/portfolios/${id}` },
    ]);

    const parsedDescription = parseDescriptionText(portfolio.description);
    const descriptionHtml = parsedDescription || STRINGS.portfolio.noDescription;

    return (
        <main className="mx-auto min-h-screen max-w-[767px] bg-background">
            {preloadUrl ? (
                <link rel="preload" as="image" href={preloadUrl} fetchPriority="high" />
            ) : null}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            <PortfolioDetailClient
                portfolio={portfolio}
                artistPortfolios={filteredArtistPortfolios}
                artistPortfolioCount={artistPortfolioCount}
                firstImageUrl={firstImageUrl}
                heroMedia={heroMedia}
                descriptionHtml={descriptionHtml}
                recommendations={recommendations}
            />
        </main>
    );
}
