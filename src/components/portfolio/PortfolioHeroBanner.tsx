// @client-reason: useState(activeTab) + document.getElementById/scrollIntoView 는 DOM 접근 필요 → SSR 불가
"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { PORTFOLIO_SECTION_IDS } from "./portfolio-section-ids";

export interface PortfolioHeroArtist {
  id: string;
  name: string;
  avatar: string | null;
  address: string;
}

interface PortfolioHeroBannerProps {
  artist: PortfolioHeroArtist;
  title: string;
  avgRating: number;
  reviewCount: number;
  price: number | null;
  priceOrigin: number | null;
  discountRate: number | null;
}

const TABS = [
  { id: "desc", label: "이벤트 설명", sectionId: PORTFOLIO_SECTION_IDS.description },
  { id: "reviews", label: "후기", sectionId: PORTFOLIO_SECTION_IDS.reviews },
  { id: "artist", label: "병원 정보", sectionId: PORTFOLIO_SECTION_IDS.artist },
] as const;

type TabId = (typeof TABS)[number]["id"];

function prefersReducedMotion(): boolean {
  return typeof globalThis.matchMedia === "function"
    && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PortfolioHeroBanner({
  artist,
  title,
  avgRating,
  reviewCount,
  price,
  priceOrigin,
  discountRate,
}: Readonly<PortfolioHeroBannerProps>): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabId>("desc");

  const handleTabClick = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    const tab = TABS.find((t) => t.id === tabId);
    if (!tab) return;
    const el = document.getElementById(tab.sectionId);
    if (el) {
      el.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    }
  }, []);

  return (
    <section aria-label="시술 정보" className="bg-background">
      <HeroHeader
        artist={artist}
        title={title}
        avgRating={avgRating}
        reviewCount={reviewCount}
        onReviewsClick={() => handleTabClick("reviews")}
      />
      <PriceBlock price={price} priceOrigin={priceOrigin} discountRate={discountRate} />
      <div className="px-4 pb-3">
        <PromoBanner />
      </div>
      <TabNav activeTab={activeTab} onTabClick={handleTabClick} reviewCount={reviewCount} />
    </section>
  );
}

function HeroHeader({
  artist, title, avgRating, reviewCount, onReviewsClick,
}: Readonly<{
  artist: PortfolioHeroArtist;
  title: string;
  avgRating: number;
  reviewCount: number;
  onReviewsClick: () => void;
}>): React.ReactElement {
  const hasRating = avgRating > 0 && reviewCount > 0;
  return (
    <div className="px-4 pt-4 pb-3">
      <ArtistProfileCard artist={artist} />
      <h1 className="mt-3 text-xl font-bold leading-tight md:text-2xl">{title}</h1>
      {hasRating ? (
        <button
          type="button"
          onClick={onReviewsClick}
          className="mt-2 inline-flex items-center gap-1 text-sm transition-colors hover:underline focus-visible:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label={`평점 ${avgRating.toFixed(1)}, 후기 ${reviewCount.toLocaleString()}개 보기`}
        >
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden />
          <span className="font-semibold">{avgRating.toFixed(1)}</span>
          <span className="text-muted-foreground underline-offset-2">
            {reviewCount.toLocaleString()}개의 후기
          </span>
        </button>
      ) : null}
    </div>
  );
}

function ArtistProfileCard({
  artist,
}: Readonly<{ artist: PortfolioHeroArtist }>): React.ReactElement {
  return (
    <Link
      href={`/artists/${artist.id}`}
      className="flex items-center gap-3 rounded-lg transition-opacity hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      aria-label={`${artist.name} 작가 페이지로 이동`}
    >
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border bg-muted">
        {artist.avatar ? (
          <Image
            src={artist.avatar}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground" aria-hidden>
            {artist.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold leading-tight">{artist.name}</p>
        {artist.address ? (
          <p className="truncate text-xs text-muted-foreground">{artist.address}</p>
        ) : null}
      </div>
    </Link>
  );
}

function PriceBlock({
  price, priceOrigin, discountRate,
}: Readonly<{
  price: number | null;
  priceOrigin: number | null;
  discountRate: number | null;
}>): React.ReactElement {
  const hasDiscount = Boolean(discountRate && discountRate > 0);
  const showOriginalPrice = Boolean(priceOrigin && priceOrigin > 0 && priceOrigin !== price);
  return (
    <div className="border-t px-4 py-4">
      {showOriginalPrice ? (
        <div className="flex items-baseline gap-2">
          <span className="w-12 text-xs text-muted-foreground">정가</span>
          <span className="text-sm text-muted-foreground line-through">
            {priceOrigin?.toLocaleString()}원
          </span>
        </div>
      ) : null}
      <div className="mt-1 flex items-baseline gap-2">
        <span className="w-12 text-xs text-muted-foreground">할인가</span>
        {hasDiscount ? (
          <span className="text-base font-bold text-brand-primary">{discountRate ?? 0}%</span>
        ) : null}
        <span className="text-2xl font-bold">{(price ?? 0).toLocaleString()}</span>
        <span className="text-sm text-muted-foreground">원</span>
      </div>
    </div>
  );
}

function TabNav({
  activeTab, onTabClick, reviewCount,
}: Readonly<{
  activeTab: TabId;
  onTabClick: (id: TabId) => void;
  reviewCount: number;
}>): React.ReactElement {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + delta + TABS.length) % TABS.length;
    const next = TABS.at(nextIndex);
    if (next) onTabClick(next.id);
  };

  return (
    <div role="tablist" aria-label="페이지 섹션" className="grid grid-cols-3 border-y border-border bg-background">
      {TABS.map((tab, index) => {
        const isActive = activeTab === tab.id;
        const labelText = tab.id === "reviews"
          ? `${tab.label}(${reviewCount.toLocaleString()})`
          : tab.label;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={tab.sectionId}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabClick(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "relative min-h-11 w-full py-3 text-sm transition-colors focus-visible:bg-muted focus-visible:outline-none",
              isActive
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground focus-visible:text-foreground",
            )}
          >
            {labelText}
            {isActive ? (
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function PromoBanner(): React.ReactElement {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-brand-primary to-brand-primary-hover px-4 py-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs opacity-90">반언니 회원가입 혜택</p>
          <p className="mt-0.5 text-base font-bold leading-snug md:text-lg">
            신규 가입하고 첫 시술 할인 받기
          </p>
          <p className="mt-1 text-[11px] opacity-80">이달의 한정 프로모션</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium">
          1/1
        </span>
      </div>
    </div>
  );
}
