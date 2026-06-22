import type { Metadata } from "next";
import { Suspense } from "react";
import {
  fetchEventById,
  fetchRecommendedEvents,
  fetchArtistShopStats,
  incrementEventViews,
} from "@/lib/supabase/event-queries";
import { fetchArtistReviewStats } from "@/lib/supabase/portfolio-detail-queries";
import { fetchReviewsByArtist } from "@/lib/supabase/queries";
import { EventDetailClient } from "@/components/event/EventDetailClient";
import { EventHeroBanner } from "@/components/event/EventHeroBanner";
import { EventShopCard } from "@/components/event/EventShopCard";
import { RecommendedEventCard } from "@/components/event/RecommendedEventCard";
import { buildPageSeo, getBreadcrumbJsonLd, getEventJsonLd, getCanonicalUrl, jsonLdSafe, descriptionOrFallback } from "@/lib/seo";
import { getEventStorageUrl, getAvatarUrl } from "@/lib/supabase/storage-utils";
import { isDetailCopy, isLegacyContent } from "@/lib/event-content-types";
import { getUser } from "@/lib/supabase/auth";

function extractSeoDescription(aiRaw: unknown, fallback: string): string {
  // AI 생성 seoDescription 은 검증 없이 JSONB 에 저장되어 ""/공백일 수 있음 → trim 후 fallback.
  if (isDetailCopy(aiRaw)) return descriptionOrFallback(aiRaw.seoDescription, fallback);
  if (isLegacyContent(aiRaw)) return descriptionOrFallback(aiRaw.seoDescription, fallback);
  return fallback;
}

export async function generateEventMetadata(id: string): Promise<Metadata> {
  const event = await fetchEventById(id);
  if (!event) {
    return {
      title: "이벤트를 찾을 수 없습니다 | 반언니",
      description: "요청하신 이벤트를 찾을 수 없습니다. 다른 이벤트를 확인해보세요.",
      robots: { index: false, follow: false },
      ...buildPageSeo({
        title: "이벤트를 찾을 수 없습니다",
        description: "요청하신 이벤트를 찾을 수 없습니다.",
        path: `/events/${id}`,
        image: null,
      }),
    };
  }

  const description = extractSeoDescription(event.ai_generated_content, event.procedure_summary);
  const detailHero = event.event_media?.find((m) => m.media_type === "detail_hero");
  const heroMedia = detailHero ?? event.event_media?.[0];
  const heroImage = heroMedia ? getEventStorageUrl(heroMedia.storage_path) : null;

  return {
    title: `${event.title} | 반언니`,
    description,
    ...buildPageSeo({
      title: event.title,
      description,
      path: `/events/${id}`,
      image: heroImage,
    }),
  };
}

async function RecommendedEvents({
  eventId,
  artistId,
}: Readonly<{ eventId: string; artistId: string }>): Promise<React.ReactElement> {
  const recommended = await fetchRecommendedEvents(eventId, artistId, 15);
  if (recommended.length === 0) return <></>;

  return (
    <section className="max-w-3xl space-y-4 px-4 py-6">
      <h2 className="text-base font-bold">회원님을 위한 추천 이벤트</h2>
      <div className="divide-y divide-input">
        {recommended.map((e) => (
          <RecommendedEventCard key={e.id} event={e} />
        ))}
      </div>
    </section>
  );
}

function RecommendedSkeleton(): React.ReactElement {
  return (
    <div className="max-w-3xl space-y-3 px-4 py-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="h-[106px] w-[106px] flex-shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="flex flex-1 flex-col justify-center gap-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function -- page orchestrator fetching parallel data + building hero banner + shop data
export async function renderEventDetailPage(id: string): Promise<React.ReactElement | null> {
  const event = await fetchEventById(id);
  if (!event) return null;

  void incrementEventViews(id);

  const [reviewStats, shopStats, user, reviewsList] = await Promise.all([
    fetchArtistReviewStats(event.artist_id),
    fetchArtistShopStats(event.artist_id),
    getUser().catch(() => null),
    fetchReviewsByArtist(event.artist_id, { limit: 3 }),
  ]);

  const heroBanner = (
    <EventHeroBanner
      artist={{
        id: event.artist_id,
        name: event.artist.title,
        avatar: getAvatarUrl(event.artist.profile_image_path),
        address: event.artist.region?.name ?? "",
      }}
      title={event.title}
      procedureName={event.procedure_name}
      avgRating={reviewStats.avgRating}
      reviewCount={reviewStats.reviewCount}
      price={event.price}
      priceOrigin={event.price_origin}
      discountRate={event.discount_rate}
      eventPeriodText={event.event_period_text}
    />
  );

  const heroImage = (() => {
    const detailHero = event.event_media?.find((m) => m.media_type === "detail_hero");
    const media = detailHero ?? event.event_media?.[0];
    return media ? getEventStorageUrl(media.storage_path) : null;
  })();

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "이벤트", path: "/events" },
    { name: event.title, path: `/events/${id}` },
  ]);

  const eventJsonLd = getEventJsonLd({
    name: event.title,
    description: extractSeoDescription(event.ai_generated_content, event.procedure_summary),
    startDate: event.created_at ?? new Date().toISOString(),
    url: getCanonicalUrl(`/events/${id}`),
    image: heroImage,
    organizerName: event.artist.title,
    organizerUrl: getCanonicalUrl(`/artists/${event.artist_id}`),
  });

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(eventJsonLd) }} />
      <EventDetailClient
        event={event}
        heroBanner={heroBanner}
        isLoggedIn={!!user}
        avgRating={reviewStats.avgRating}
        reviewCount={reviewStats.reviewCount}
        recentReviews={reviewsList.data.map((r) => ({
          id: r.id,
          rating: r.rating,
          content: r.content,
          authorName: r.profile?.nickname ?? "익명",
          createdAt: r.created_at ?? new Date().toISOString(),
        }))}
        shopInfoCard={
          <section className="w-full max-w-3xl px-4 py-4" aria-label="샵 정보">
            <EventShopCard
              shop={{
                artistId: event.artist_id,
                artistName: event.artist.title,
                artistAvatar: getAvatarUrl(event.artist.profile_image_path),
                address: event.artist.address ?? "",
                avgRating: reviewStats.avgRating,
                reviewCount: reviewStats.reviewCount,
                eventCount: shopStats.eventCount,
                portfolioCount: shopStats.portfolioCount,
                shopName: event.shop_name,
                shopRegion: event.shop_region,
                shopBusinessHours: event.shop_business_hours,
                shopParking: event.shop_parking,
                shopBookingMethod: event.shop_booking_method,
              }}
            />
          </section>
        }
        recommendedSection={
          <Suspense fallback={<RecommendedSkeleton />}>
            <RecommendedEvents eventId={event.id} artistId={event.artist_id} />
          </Suspense>
        }
      />
    </div>
  );
}
