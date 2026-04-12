import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { isLegacyNumericId, findArtistByLegacyId } from "@/lib/supabase/legacy-redirect";
import {
  fetchArtistById,
  fetchPortfoliosByArtist,
  fetchReviewsByArtist,
  getStorageUrl,
  getAvatarUrl,
  getArtistMediaUrl,
} from "@/lib/supabase/queries";
import { ArtistTopBar } from "@/components/artists/ArtistTopBar";
import { ArtistHeader } from "@/components/artists/ArtistHeader";
import { ArtistDetailTabs } from "@/components/artists/ArtistDetailTabs";
import { FloatingCTA } from "@/components/artists/FloatingCTA";
import { getAlternates, getArtistJsonLd, getBreadcrumbJsonLd, getCanonicalUrl } from "@/lib/seo";
import { getUser } from "@/lib/supabase/auth";
import { fetchLikedArtistIds } from "@/lib/actions/likes";

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

  return {
    title: artist.title,
    description,
    openGraph: {
      title: artist.title,
      description,
      type: "profile",
      locale: "ko_KR",
      url: getCanonicalUrl(`/artists/${id}`),
    },
    alternates: getAlternates(`/artists/${id}`),
  };
}

interface MediaItem {
  storage_path: string;
  order_index: number;
}

function extractPortfolioImages(
  portfolios: Array<{ portfolio_media: MediaItem[] }>,
): string[] {
  const images: string[] = [];
  for (const p of portfolios) {
    const sorted = [...p.portfolio_media].sort((a, b) => a.order_index - b.order_index);
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
  const sorted = [...artistMedia].sort((a, b) => a.order_index - b.order_index);
  const images: string[] = [];
  for (const m of sorted) {
    const url = getArtistMediaUrl(m.storage_path);
    if (url) images.push(url);
  }
  return images;
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

  const [{ data: portfolios }, { data: reviews }, user, likedIds] = await Promise.all([
    fetchPortfoliosByArtist(id, { limit: 50 }),
    fetchReviewsByArtist(id),
    getUser().catch(() => null),
    fetchLikedArtistIds(),
  ]);

  const avatarUrl = getAvatarUrl(artist.profile_image_path ?? null);

  // Use artist gallery images if available, otherwise fall back to portfolio images
  const artistGalleryImages = extractArtistGalleryImages(artist.artist_media);
  const portfolioImages = extractPortfolioImages(portfolios);
  const heroImages = artistGalleryImages.length > 0 ? artistGalleryImages : portfolioImages;

  const artistJsonLd = getArtistJsonLd({
    name: artist.title,
    description: artist.introduce,
    address: artist.address,
    url: getCanonicalUrl(`/artists/${id}`),
    latitude: artist.lat,
    longitude: artist.lon,
  });

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", path: "" },
    { name: "아티스트", path: "/artists" },
    { name: artist.title, path: `/artists/${id}` },
  ]);

  return (
    <main className="mx-auto w-full max-w-[767px] pb-20 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(artistJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <ArtistTopBar
        backLabel={STRINGS.common.back}
        shareLabel={STRINGS.common.share}
      />

      <ArtistHeader
        artist={artist}
        portfolioImages={heroImages}
        avatarUrl={avatarUrl}
        reviewCount={reviews.length}
        isLiked={likedIds.includes(id)}
      />

      <ArtistDetailTabs
        portfolios={portfolios}
        portfolioLabel={STRINGS.artist.portfolio}
        reviewsLabel={STRINGS.artist.reviews}
        totalCountLabel={STRINGS.artist.totalCount.replace("{count}", String(portfolioImages.length))}
        noPortfolioMessage={STRINGS.artist.noPortfolio}
        noReviewsMessage={STRINGS.artist.noReviews}
        reviews={reviews}
        tabsAriaLabel={STRINGS.pages.artistsList}
        gridViewLabel={STRINGS.common.gridView}
        listViewLabel={STRINGS.common.listView}
        artistId={id}
        writeReviewLabel={STRINGS.review.writeReview}
        isLoggedIn={!!user}
      />

      <FloatingCTA
        kakaoUrl={artist.kakao_url}
        contact={artist.contact ?? null}
        artistUserId={artist.user_id}
        artistName={artist.title}
        artistId={id}
      />
    </main>
  );
}
