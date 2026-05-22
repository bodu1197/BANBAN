import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { isLegacyNumericId, findArtistByLegacyId } from "@/lib/supabase/legacy-redirect";
import {
  fetchArtistById,
  fetchPortfoliosByArtist,
  fetchReviewsByArtist,
  fetchBeforeAfterByArtist,
  getStorageUrl,
  getAvatarUrl,
  getArtistMediaUrl,
} from "@/lib/supabase/queries";
import { fetchEventsByArtist } from "@/lib/supabase/event-queries";
import { ArtistTopBar } from "@/components/artists/ArtistTopBar";
import { ShopHeroBanner } from "@/components/artists/ShopHeroBanner";
import { ShopBlogClient } from "@/components/artists/ShopBlogClient";
import { FloatingCTA } from "@/components/artists/FloatingCTA";
import { buildPageSeo, getArtistJsonLd, getBreadcrumbJsonLd, getCanonicalUrl, jsonLdSafe } from "@/lib/seo";
import { getUser } from "@/lib/supabase/auth";
import { fetchLikedArtistIds } from "@/lib/actions/likes";

const DEFAULT_SHOP_BANNERS = [
  "/images/defaults/shop-banner-1.jpg",
  "/images/defaults/shop-banner-2.jpg",
];

export async function generateArtistDetailMetadata(id: string): Promise<Metadata> {
  // Legacy numeric ID → 301 redirect to UUID URL
  if (isLegacyNumericId(id)) {
    const uuid = await findArtistByLegacyId(Number(id));
    if (uuid) {
      permanentRedirect(`/artists/${uuid}`);
    }
    return { title: "Artist Not Found" };
  }

  const artist = await fetchArtistById(id);

  if (!artist) {
    return { title: "Artist Not Found" };
  }

  const description = artist.introduce;
  const galleryImage = artist.artist_media?.length
    ? getArtistMediaUrl([...artist.artist_media].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))[0].storage_path)
    : null;
  const avatarImage = getAvatarUrl(artist.profile_image_path ?? null);
  const ogImage = galleryImage ?? avatarImage ?? null;

  return {
    title: artist.title,
    description,
    ...buildPageSeo({
      title: artist.title,
      description,
      path: `/artists/${id}`,
      image: ogImage,
      type: "profile",
    }),
  };
}

interface MediaItem {
  storage_path: string;
  order_index: number | null;
}

function extractPortfolioImages(
  portfolios: Array<{ portfolio_media: MediaItem[] }>,
): string[] {
  const images: string[] = [];
  for (const p of portfolios) {
    const sorted = [...p.portfolio_media].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    for (const m of sorted) {
      const url = getStorageUrl(m.storage_path);
      if (url) images.push(url);
    }
  }
  return images;
}

function extractArtistGalleryImages(
  artistMedia: MediaItem[] | undefined,
): string[] {
  if (!artistMedia || artistMedia.length === 0) return [];
  const sorted = [...artistMedia].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const images: string[] = [];
  for (const m of sorted) {
    const url = getArtistMediaUrl(m.storage_path);
    if (url) images.push(url);
  }
  return images;
}

interface BuildArtistJsonLdInput {
  id: string;
  artist: NonNullable<Awaited<ReturnType<typeof fetchArtistById>>>;
  artistGalleryImages: string[];
  avatarUrl: string | null;
  reviewCount: number;
  ratingAvg: number | undefined;
}

function buildArtistJsonLdProps(input: BuildArtistJsonLdInput): Parameters<typeof getArtistJsonLd>[0] {
  const { id, artist, artistGalleryImages, avatarUrl, reviewCount, ratingAvg } = input;
  return {
    name: artist.title,
    description: artist.introduce,
    address: artist.address,
    image: artistGalleryImages[0] ?? avatarUrl ?? undefined,
    url: getCanonicalUrl(`/artists/${id}`),
    latitude: artist.lat,
    longitude: artist.lon,
    rating: ratingAvg,
    reviewCount: reviewCount > 0 ? reviewCount : undefined,
  };
}

// eslint-disable-next-line max-lines-per-function
export async function renderArtistDetailPage(id: string): Promise<React.ReactElement> {
  // Legacy numeric ID → 301 redirect to UUID URL
  if (isLegacyNumericId(id)) {
    const uuid = await findArtistByLegacyId(Number(id));
    if (uuid) {
      permanentRedirect(`/artists/${uuid}`);
    }
    notFound();
  }

  const artist = await fetchArtistById(id);

  if (!artist) {
    notFound();
  }

  const [{ data: portfolios }, { data: reviews }, user, likedIds, beforeAfterPhotos, events] = await Promise.all([
    fetchPortfoliosByArtist(id, { limit: 50 }),
    fetchReviewsByArtist(id),
    getUser().catch(() => null),
    fetchLikedArtistIds(),
    fetchBeforeAfterByArtist(id),
    fetchEventsByArtist(id),
  ]);

  const avatarUrl = getAvatarUrl(artist.profile_image_path ?? null);

  const artistGalleryImages = extractArtistGalleryImages(artist.artist_media);
  const portfolioImages = extractPortfolioImages(portfolios);
  const heroImages = artistGalleryImages.length > 0 ? artistGalleryImages : DEFAULT_SHOP_BANNERS;

  const reviewCount = reviews.length;
  const ratingAvg = reviewCount > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : undefined;

  const artistJsonLd = getArtistJsonLd(buildArtistJsonLdProps({
    id, artist, artistGalleryImages, avatarUrl, reviewCount, ratingAvg,
  }));

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", path: "" },
    { name: "아티스트", path: "/artists" },
    { name: artist.title, path: `/artists/${id}` },
  ]);

  return (
    <main className="mx-auto w-full max-w-[1024px] pb-20 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(artistJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbJsonLd) }}
      />

      <ArtistTopBar
        shopName={artist.title}
        backLabel={STRINGS.common.back}
        shareLabel={STRINGS.common.share}
      />

      <ShopBlogClient
        hero={
          <ShopHeroBanner
            shop={artist}
            heroImages={heroImages}
            reviewCount={reviewCount}
            avgRating={ratingAvg ?? 0}
            isLiked={likedIds.includes(id)}
          />
        }
        events={events}
        portfolios={portfolios}
        reviews={reviews}
        beforeAfterPhotos={beforeAfterPhotos}
        eventCount={events.length}
        portfolioCount={portfolios.length}
        beforeAfterCount={beforeAfterPhotos.length}
        reviewCount={reviewCount}
        totalCountLabel={STRINGS.artist.totalCount.replace("{count}", String(portfolioImages.length))}
        noPortfolioMessage={STRINGS.artist.noPortfolio}
        noReviewsMessage={STRINGS.artist.noReviews}
        noBeforeAfterMessage={STRINGS.artist.noBeforeAfter}
        noEventsMessage={STRINGS.artist.noEvents}
        beforeAfterCountLabel={STRINGS.artist.beforeAfterCount.replace("{count}", String(beforeAfterPhotos.length))}
        gridViewLabel={STRINGS.common.gridView}
        listViewLabel={STRINGS.common.listView}
        beforeLabel={STRINGS.artist.beforeLabel}
        afterLabel={STRINGS.artist.afterLabel}
        eventsLabel={STRINGS.artist.events}
        portfolioLabel={STRINGS.artist.portfolio}
        beforeAfterLabel={STRINGS.artist.beforeAfter}
        reviewsLabel={STRINGS.artist.reviews}
        writeReviewLabel={STRINGS.review.writeReview}
        artistId={id}
        isLoggedIn={!!user}
      />

      <FloatingCTA
        kakaoUrl={artist.kakao_url}
        contact={artist.contact ?? null}
        artistId={id}
      />
    </main>
  );
}
