// @client-reason: Interactive search/filter with type tabs, region selector, load-more pagination
"use client";

import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import type { ArtistInsight } from "@/lib/supabase/artist-insight-queries";
import type { Region } from "@/types/database";
import BlogFilters from "@/components/blog/BlogFilters";
import BlogLoadMore from "@/components/blog/BlogLoadMore";
import { useInsightSearch } from "./useInsightSearch";

function getLocalizedTitle(insight: ArtistInsight): string {
  return insight.title;
}

function InsightCard({ insight, profileImage }: Readonly<{
  insight: ArtistInsight; profileImage: string | null;
}>): React.ReactElement {
  const title = getLocalizedTitle(insight);
  const thumbnailUrl = profileImage ?? insight.cover_image_url;

  return (
    <Link
      href={`/artist-insight/${insight.slug}`}
      className="group block overflow-hidden rounded-xl border border-border transition-colors hover:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {thumbnailUrl ? (
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          <Image src={thumbnailUrl} alt={insight.artist_name ?? title} fill className="object-cover transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105" sizes="(max-width: 767px) 50vw, 360px" unoptimized />
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-muted text-3xl font-bold text-muted-foreground/30">
          {insight.artist_name?.charAt(0).toUpperCase() ?? "?"}
        </div>
      )}
      <div className="p-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {insight.artist_name ? (
            <span className="truncate text-sm font-bold">{insight.artist_name}</span>
          ) : null}
          {insight.avg_rating > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-xs text-yellow-500">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              {insight.avg_rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        <h2 className="mb-1 text-xs font-medium leading-snug text-muted-foreground line-clamp-2">{title}</h2>
        <div className="flex flex-wrap gap-1">
          {insight.specialties.slice(0, 2).map(s => (
            <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{s}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}

interface InsightSearchData {
  insights: ArtistInsight[];
  totalCount: number;
  regions: Region[];
  profileImages: Record<string, string>;
}

export default function InsightSearchClient({ initial }: Readonly<{
    initial: InsightSearchData;
}>): React.ReactElement {
  const state = useInsightSearch(initial);

  return (
    <section>
      <BlogFilters
        regions={state.regions}
        regionId={state.regionId}
        regionSido={state.regionSido}
        onRegionChange={state.setRegions}
      />
      {/* 아티스트 수 표시 비활성화 */}
      {state.insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">검색 결과가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {state.insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              profileImage={initial.profileImages[insight.artist_id] ?? null}
            />
          ))}
        </div>
      )}
      <BlogLoadMore hasMore={state.hasMore} loading={state.loading} onLoadMore={state.loadMore} />
    </section>
  );
}
