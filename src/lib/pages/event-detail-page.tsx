import type { Metadata } from "next";
import { Suspense } from "react";
import {
  fetchEventById,
  fetchRecommendedEvents,
  fetchArtistShopStats,
  incrementEventViews,
} from "@/lib/supabase/event-queries";
import { fetchArtistReviewStats } from "@/lib/supabase/portfolio-detail-queries";
import Image from "next/image";
import Link from "next/link";
import { EventDetailClient } from "@/components/event/EventDetailClient";
import { ShopNavTabs } from "@/components/artists/ShopNavTabs";
import { EventHeroBanner } from "@/components/event/EventHeroBanner";
import { buildPageSeo, getBreadcrumbJsonLd, getEventJsonLd, getCanonicalUrl, jsonLdSafe } from "@/lib/seo";
import { getEventStorageUrl, getAvatarUrl } from "@/lib/supabase/storage-utils";
import { isDetailCopy, isLegacyContent } from "@/lib/event-content-types";
import { getUser } from "@/lib/supabase/auth";

function extractSeoDescription(aiRaw: unknown, fallback: string): string {
  if (isDetailCopy(aiRaw)) return aiRaw.seoDescription ?? fallback;
  if (isLegacyContent(aiRaw)) return aiRaw.seoDescription ?? fallback;
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
    <section className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h2 className="text-base font-bold">회원님을 위한 추천 이벤트</h2>
      <div className="divide-y divide-input">
        {recommended.map((e) => {
          const artistName = typeof e.artist === "object" ? e.artist.title : "";
          const regionName =
            typeof e.artist === "object" && e.artist.region
              ? typeof e.artist.region === "object" && "name" in e.artist.region
                ? (e.artist.region as { name: string }).name
                : ""
              : "";

          return (
            <Link
              key={e.id}
              href={`/events/${e.id}`}
              className="flex gap-3 py-3 transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                {e.hero_image ? (
                  <Image
                    src={e.hero_image}
                    alt={e.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 96px, 120px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                )}
                {(e.discount_rate ?? 0) > 0 && (
                  <span className="absolute left-1 top-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {e.discount_rate}%
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.procedure_name}</p>
                {(artistName || regionName) && (
                  <p className="truncate text-xs text-muted-foreground">
                    {artistName}{regionName ? ` · ${regionName}` : ""}
                  </p>
                )}
                <div className="flex items-baseline gap-1.5">
                  {(e.discount_rate ?? 0) > 0 && (
                    <span className="text-xs text-muted-foreground line-through">
                      {e.price_origin.toLocaleString()}원
                    </span>
                  )}
                  <span className="text-sm font-bold text-foreground">
                    {e.price.toLocaleString()}원
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function RecommendedSkeleton(): React.ReactElement {
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-4 py-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="h-24 w-24 flex-shrink-0 animate-pulse rounded-lg bg-muted" />
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

  const [reviewStats, shopStats, user] = await Promise.all([
    fetchArtistReviewStats(event.artist_id),
    fetchArtistShopStats(event.artist_id),
    getUser().catch(() => null),
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
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(eventJsonLd) }} />
      <EventDetailClient
        event={event}
        heroBanner={heroBanner}
        isLoggedIn={!!user}
        avgRating={reviewStats.avgRating}
        reviewCount={reviewStats.reviewCount}
        shopTabs={
          <ShopNavTabs
            artistId={event.artist_id}
            eventCount={shopStats.eventCount}
            portfolioCount={shopStats.portfolioCount}
            beforeAfterCount={0}
            reviewCount={reviewStats.reviewCount}
            stickyTopClass="top-[69px]"
          />
        }
        recommendedSection={
          <Suspense fallback={<RecommendedSkeleton />}>
            <RecommendedEvents eventId={event.id} artistId={event.artist_id} />
          </Suspense>
        }
      />
    </main>
  );
}
