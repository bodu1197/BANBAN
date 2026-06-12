import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import Link from "next/link";
import { STRINGS } from "@/lib/strings";
import { isLegacyNumericId, findArtistByLegacyId } from "@/lib/supabase/legacy-redirect";
import {
  fetchArtistById,
  fetchOwnArtistForPreview,
  fetchArtistForAdminPreview,
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
import { ContactBottomBar } from "@/components/shared/ContactBottomBar";
import { buildPageSeo, getArtistJsonLd, getBreadcrumbJsonLd, getCanonicalUrl, jsonLdSafe } from "@/lib/seo";
import { getUser } from "@/lib/supabase/auth";
import { fetchLikedArtistIds } from "@/lib/actions/likes";
import { parseBusinessHours } from "@/types/artist-form";

const DEFAULT_SHOP_BANNERS = [
  "/images/defaults/shop-banner-1.jpg",
  "/images/defaults/shop-banner-2.jpg",
];

/** OG/대표 이미지 우선순위: 배너 → 갤러리 첫장 → 프로필 아바타. */
function resolveArtistOgImage(artist: NonNullable<Awaited<ReturnType<typeof fetchArtistById>>>): string | null {
  const bannerImage = artist.banner_path ? getArtistMediaUrl(artist.banner_path) : null;
  const galleryImage = artist.artist_media?.length
    ? getArtistMediaUrl([...artist.artist_media].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))[0].storage_path)
    : null;
  const avatarImage = getAvatarUrl(artist.profile_image_path ?? null);
  return bannerImage ?? galleryImage ?? avatarImage ?? null;
}

export async function generateArtistDetailMetadata(id: string): Promise<Metadata> {
  // Legacy numeric ID → 301 redirect to UUID URL
  if (isLegacyNumericId(id)) {
    const uuid = await findArtistByLegacyId(Number(id));
    if (uuid) {
      permanentRedirect(`/artists/${uuid}`);
    }
    // 매칭 UUID 없음 → 진짜 404. generateMetadata 도 notFound 로 통일해 soft 404(200) 방지.
    notFound();
  }

  const artist = await fetchArtistById(id);

  // 휴면(status=dormant)·미승인(approved_at NULL)·삭제·미존재 → 깨끗한 HTTP 404.
  // 200+noindex(soft 404)는 구글 크롤 감점 → notFound()로 정상 404 신호를 보낸다.
  if (!artist) {
    notFound();
  }

  const description = artist.introduce;
  const ogImage = resolveArtistOgImage(artist);

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
  bannerImage: string | null;
  avatarUrl: string | null;
  reviewCount: number;
  ratingAvg: number | undefined;
  portfolios: ReadonlyArray<{ title: string; price: number | null }>;
}

function buildArtistJsonLdProps(input: BuildArtistJsonLdInput): Parameters<typeof getArtistJsonLd>[0] {
  const { id, artist, artistGalleryImages, bannerImage, avatarUrl, reviewCount, ratingAvg, portfolios } = input;
  // 시술 가격(Offer) + 영업시간(OpeningHours) AEO/GEO 스키마 — 추가 페칭 없이 기존 데이터 활용.
  // slice(30): JSON-LD 비대화 방지 캡 — 포폴 최대 50개 페칭 중 대표 30개면 AEO 인용에 충분.
  const offers = portfolios
    .flatMap((p) => (typeof p.price === "number" && p.price > 0 ? [{ name: p.title, price: p.price }] : []))
    .slice(0, 30);
  return {
    name: artist.title,
    description: artist.introduce,
    address: artist.address,
    image: bannerImage ?? artistGalleryImages[0] ?? avatarUrl ?? undefined,
    url: getCanonicalUrl(`/artists/${id}`),
    latitude: artist.lat,
    longitude: artist.lon,
    rating: ratingAvg,
    reviewCount: reviewCount > 0 ? reviewCount : undefined,
    offers: offers.length > 0 ? offers : undefined,
    openingHours: parseBusinessHours(artist.business_hours),
  };
}

function buildArtistDetailView(
  id: string,
  artist: NonNullable<Awaited<ReturnType<typeof fetchArtistById>>>,
  portfolios: Awaited<ReturnType<typeof fetchPortfoliosByArtist>>["data"],
  reviews: Awaited<ReturnType<typeof fetchReviewsByArtist>>["data"],
): {
  heroImages: string[];
  portfolioImages: string[];
  reviewCount: number;
  ratingAvg: number | undefined;
  artistJsonLd: ReturnType<typeof getArtistJsonLd>;
  breadcrumbJsonLd: ReturnType<typeof getBreadcrumbJsonLd>;
} {
  const avatarUrl = getAvatarUrl(artist.profile_image_path ?? null);
  const artistGalleryImages = extractArtistGalleryImages(artist.artist_media);
  const portfolioImages = extractPortfolioImages(portfolios);
  // 대표 배너(banner_path)를 hero 맨 앞에. 레거시(배너 없음)는 기존 갤러리만 — 무회귀.
  const bannerImage = artist.banner_path ? getArtistMediaUrl(artist.banner_path) : null;
  const heroSource = bannerImage ? [bannerImage, ...artistGalleryImages] : artistGalleryImages;
  const heroImages = heroSource.length > 0 ? heroSource : DEFAULT_SHOP_BANNERS;

  const reviewCount = reviews.length;
  const ratingAvg = reviewCount > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : undefined;

  const artistJsonLd = getArtistJsonLd(buildArtistJsonLdProps({
    id, artist, artistGalleryImages, bannerImage, avatarUrl, reviewCount, ratingAvg, portfolios: portfolios ?? [],
  }));

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "아티스트", path: "/artists" },
    { name: artist.title, path: `/artists/${id}` },
  ]);

  return { heroImages, portfolioImages, reviewCount, ratingAvg, artistJsonLd, breadcrumbJsonLd };
}

interface PreviewConfig {
  message: string;
  backHref: string;
  backLabel: string;
}

function PreviewBanner({ message, backHref, backLabel }: Readonly<PreviewConfig>): React.ReactElement {
  return (
    <div className="sticky top-0 z-[60] flex items-center justify-between gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2.5">
      <p className="text-sm font-medium text-amber-800">{message}</p>
      <Link
        href={backHref}
        className="shrink-0 text-xs font-semibold text-amber-700 underline transition-colors hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {backLabel}
      </Link>
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function
async function renderArtistDetailContent(
  id: string,
  artist: NonNullable<Awaited<ReturnType<typeof fetchArtistById>>>,
  opts?: { preview?: PreviewConfig },
): Promise<React.ReactElement> {
  const preview = opts?.preview;
  const isPreview = preview !== undefined;

  const [{ data: portfolios }, { data: reviews }, user, likedIds, beforeAfterPhotos, events] = await Promise.all([
    fetchPortfoliosByArtist(id, { limit: 50 }),
    fetchReviewsByArtist(id),
    getUser().catch(() => null),
    fetchLikedArtistIds(),
    fetchBeforeAfterByArtist(id),
    fetchEventsByArtist(id),
  ]);

  const { heroImages, portfolioImages, reviewCount, ratingAvg, artistJsonLd, breadcrumbJsonLd } =
    buildArtistDetailView(id, artist, portfolios, reviews);

  return (
    <div className="mx-auto w-full max-w-[1024px] pb-20 md:pb-0">
      {preview && <PreviewBanner {...preview} />}
      {/* 비공개 미리보기에는 JSON-LD 미출력(색인 대상 아님). 공개 페이지만 구조화 데이터 노출. */}
      {!isPreview && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLdSafe(artistJsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbJsonLd) }}
          />
        </>
      )}

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
        data={{ events, portfolios, reviews, beforeAfterPhotos }}
        counts={{
          events: events.length,
          portfolios: portfolios.length,
          beforeAfter: beforeAfterPhotos.length,
          reviews: reviewCount,
        }}
        labels={{
          totalCount: STRINGS.artist.totalCount.replace("{count}", String(portfolioImages.length)),
          noPortfolio: STRINGS.artist.noPortfolio,
          noReviews: STRINGS.artist.noReviews,
          noBeforeAfter: STRINGS.artist.noBeforeAfter,
          noEvents: STRINGS.artist.noEvents,
          beforeAfterCount: STRINGS.artist.beforeAfterCount.replace("{count}", String(beforeAfterPhotos.length)),
          gridView: STRINGS.common.gridView,
          listView: STRINGS.common.listView,
          before: STRINGS.artist.beforeLabel,
          after: STRINGS.artist.afterLabel,
          events: STRINGS.artist.events,
          portfolio: STRINGS.artist.portfolio,
          beforeAfter: STRINGS.artist.beforeAfter,
          reviews: STRINGS.artist.reviews,
          writeReview: STRINGS.review.writeReview,
        }}
        artistId={id}
        isLoggedIn={!!user}
      />

      <ContactBottomBar
        kakaoUrl={artist.kakao_url}
        contact={artist.contact ?? null}
        artistId={id}
        sourceType="artist"
        sourceId={id}
      />
    </div>
  );
}

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

  return renderArtistDetailContent(id, artist);
}

/**
 * 본인 전용 비공개 미리보기(/mypage/artist/preview).
 * fetchOwnArtistForPreview 가 user_id 로 스코프 + RLS owner 이중 보호 → 타인 pending/rejected 샵 노출 불가.
 */
export async function renderOwnArtistPreviewPage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");

  const artist = await fetchOwnArtistForPreview(user.id);
  if (!artist) redirect("/register/artist");

  return renderArtistDetailContent(artist.id, artist, {
    preview: { message: "비공개 미리보기 · 관리자 승인 후 공개됩니다", backHref: "/mypage", backLabel: "마이페이지" },
  });
}

/**
 * 관리자 검수 미리보기(/admin-shop-preview/[id]).
 * fetchArtistForAdminPreview 가 status 무관 단건 조회 → pending/rejected 샵도 전체 렌더.
 * 호출 라우트가 isCurrentUserAdmin 게이트(미관리자 notFound) 선행 → 비공개 샵 노출 차단.
 */
export async function renderAdminArtistPreviewPage(id: string): Promise<React.ReactElement> {
  const artist = await fetchArtistForAdminPreview(id);
  if (!artist) notFound();

  return renderArtistDetailContent(artist.id, artist, {
    preview: {
      message: "관리자 검수 미리보기 · 승인 전 비공개 상태입니다",
      backHref: "/admin/artist-approvals",
      backLabel: "승인 대기 목록",
    },
  });
}
