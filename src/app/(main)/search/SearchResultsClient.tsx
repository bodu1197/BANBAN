// @client-reason: useSearchParams for reading query, fetch for search API
"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { STRINGS } from "@/lib/strings";
import { GridPortfolioCard } from "@/components/home/cards";
import type { HomePortfolio } from "@/lib/supabase/portfolio-common";
import type { HomeArtist } from "@/lib/supabase/home-artist-queries";
import { useSearchFetch, type ArtistResult } from "./useSearchFetch";
import { SearchExplore } from "./SearchExplore";

// --- Tab button ---

function TabButton({ label, active, onClick }: Readonly<{
  label: string; active: boolean; onClick: () => void;
}>): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 py-3 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-b-2 border-brand-primary text-brand-primary"
          : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

// --- Artist card ---

function ArtistResultCard({ artist }: Readonly<{
  artist: ArtistResult;
}>): React.ReactElement {
  return (
    <Link
      href={`/artists/${artist.id}`}
      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
        {artist.profileImage ? (
          <Image src={artist.profileImage} alt={artist.name} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg text-muted-foreground">
            {artist.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{artist.name}</p>
        {artist.region && (
          <span className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {artist.region}
          </span>
        )}
      </div>
    </Link>
  );
}

// --- Content sections ---

function PortfolioResults({ portfolios }: Readonly<{
  portfolios: HomePortfolio[];
}>): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3">
      {portfolios.map((p, i) => (
        <GridPortfolioCard key={p.id} portfolio={p} priority={i < 2} />
      ))}
    </div>
  );
}

function ArtistResults({ artists }: Readonly<{
  artists: ArtistResult[];
}>): React.ReactElement {
  return (
    <div className="space-y-3">
      {artists.map((a) => <ArtistResultCard key={a.id} artist={a} />)}
    </div>
  );
}

function SearchSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={`skel-${String(i)}`} className="animate-pulse space-y-2">
          <div className="aspect-square rounded-lg bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: Readonly<{ message: string }>): React.ReactElement {
  return (
    <div className="flex items-center justify-center py-20">
      {/* role="status" — 결과 없음·조회 실패가 화면에만 보이고 스크린리더엔 안 읽히던 문제 */}
      <p role="status" className="text-muted-foreground">{message}</p>
    </div>
  );
}

// --- Main inner component ---

/**
 * 더보기 영역 — 마지막 페이지에서도 자리를 비우지 않는다.
 * 버튼이 사라지면 거기 있던 포커스가 body 로 날아가 키보드·스크린리더 사용자가 위치를 잃는다.
 */
function loadMoreLabel(hasMore: boolean, isLoadingMore: boolean): string {
  if (isLoadingMore) return STRINGS.common.loading;
  return hasMore ? STRINGS.common.seeMore : STRINGS.globalSearch.allShown;
}

function LoadMore({ shown, total, isLoadingMore, hasMore, onLoadMore }: Readonly<{
  shown: number; total: number; isLoadingMore: boolean; hasMore: boolean; onLoadMore: () => void;
}>): React.ReactElement {
  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      {/* 새 항목은 버튼 위에 추가돼 시각적으로만 늘어난다 → 스크린리더에는 여기서 알린다 */}
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {STRINGS.globalSearch.shownOfTotal.replace("{shown}", String(shown)).replace("{total}", String(total))}
      </p>
      {/* disabled 대신 aria-disabled — disabled 가 되는 순간 포커스가 body 로 떨어져 위치를 잃는다.
          마지막 페이지에도 버튼을 남겨 포커스 앵커를 유지한다(중복 클릭은 훅의 가드가 막는다). */}
      <button
        type="button"
        onClick={onLoadMore}
        aria-disabled={!hasMore || isLoadingMore}
        aria-busy={isLoadingMore}
        className={`inline-flex min-h-11 items-center rounded-full border border-border px-6 py-2 text-sm font-medium text-foreground motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
          hasMore
            ? "hover:border-brand-primary hover:text-brand-primary focus-visible:border-brand-primary focus-visible:text-brand-primary"
            : "opacity-60"
        }`}
      >
        {loadMoreLabel(hasMore, isLoadingMore)}
      </button>
    </div>
  );
}

function SearchResultsInner({ popularArtists }: Readonly<{ popularArtists: ReadonlyArray<HomeArtist> }>): React.ReactElement {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [tab, setTab] = useState<"portfolio" | "artist">("portfolio");
  const d = STRINGS.globalSearch;

  // useSearchFetch 는 query 가 비어있으면 enabled:false 로 fetch 안 함 — hook 순서 보존을 위해 항상 호출
  const { portfolios, artists, totalCount, isLoading, isLoadingMore, isError, hasMore, loadMore } = useSearchFetch(query);

  const renderContent = (): React.ReactElement => {
    if (isLoading) return <SearchSkeleton />;
    // 조회 실패를 빈 결과로 보여주면 "이 키워드는 결과가 없구나" 로 오인하고 떠난다.
    // 단 더보기 실패는 이미 본 목록을 지우면 안 된다 → 결과가 하나도 없을 때만 오류 화면.
    const empty = portfolios.length === 0 && artists.length === 0;
    if (isError && empty) return <EmptyState message={d.searchFailed} />;
    if (tab === "artist") {
      return artists.length > 0 ? <ArtistResults artists={artists} /> : <EmptyState message={d.noSearchResults} />;
    }
    if (portfolios.length === 0) return <EmptyState message={d.noSearchResults} />;
    return (
      <>
        <PortfolioResults portfolios={portfolios} />
        <LoadMore
          shown={portfolios.length}
          total={totalCount}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </>
    );
  };

  // q 없으면 탐색 모드 — autoFocus 검색바 + 인기 검색어 + 인기 아티스트
  if (!query.trim()) {
    return <SearchExplore popularArtists={popularArtists} />;
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">{d.searchResults}: &quot;{query}&quot;</h1>
      <div className="mb-4 flex border-b border-border">
        {/* 탭 옆 숫자는 "총 결과 수" 로 읽힌다 → 화면에 그려진 개수가 아니라 총계를 쓴다 */}
        <TabButton label={`${d.portfolioResults} (${totalCount})`} active={tab === "portfolio"} onClick={() => setTab("portfolio")} />
        <TabButton label={`${d.artistResults} (${artists.length})`} active={tab === "artist"} onClick={() => setTab("artist")} />
      </div>
      {renderContent()}
    </div>
  );
}

export function SearchResultsClient({ popularArtists }: Readonly<{ popularArtists: ReadonlyArray<HomeArtist> }>): React.ReactElement {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchResultsInner popularArtists={popularArtists} />
    </Suspense>
  );
}
