// @client-reason: shuffles trending pool on mount so each visitor gets a different
// random slice — the home page is ISR-cached for 1h, so server-side shuffling
// would freeze for the entire cache window.
"use client";

import { useMemo, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { HorizontalScrollList } from "./HorizontalScrollList";
import { UserAvatar } from "./UserAvatar";
import { PriceDisplay } from "./PriceDisplay";
import type { SimilarityGalleryItem } from "@/lib/supabase/ai-gallery-queries";
import { secureShuffle } from "@/lib/random";

const DISPLAY_COUNT = 10;
const NOOP_SUBSCRIBE = (): (() => void) => () => {};

/**
 * Returns false during SSR/initial hydration, true once running on the client.
 * Uses `useSyncExternalStore` so we don't need a setState-in-effect mount flag
 * (which the project's lint rule forbids).
 */
function useIsClient(): boolean {
    return useSyncExternalStore(NOOP_SUBSCRIBE, () => true, () => false);
}

export function AiGallerySection({ items, title, moreText, compact }: Readonly<{
    items: SimilarityGalleryItem[];
    title: string;
    moreText?: string;
    compact?: boolean;
}>): React.ReactElement | null {
    // SSR/initial render uses the first N of the pool so hydration matches the
    // server-rendered HTML. Once running on the client we flip to a shuffled
    // slice — each visitor sees a different mix without server cost.
    const isClient = useIsClient();
    const displayed = useMemo(() => {
        if (items.length <= DISPLAY_COUNT) return items;
        if (!isClient) return items.slice(0, DISPLAY_COUNT);
        return secureShuffle(items).slice(0, DISPLAY_COUNT);
    }, [items, isClient]);

    if (compact) return <CompactGallery items={displayed} title={title} />;

    if (items.length === 0) return null;

    return (
        <section className="py-4">
            <SectionHeader
                title={title}
                moreLink="/ai-studio"
                moreText={moreText}
            />
            <HorizontalScrollList>
                {displayed.map((item) => (
                    <SimilarityCard key={item.id} item={item} />
                ))}
            </HorizontalScrollList>
        </section>
    );
}

function CompactGallery({ items, title }: Readonly<{
    items: SimilarityGalleryItem[];
    title: string;
}>): React.ReactElement {
    const topItems = items.slice(0, 2);

    return (
        <Link
            href="/ai-studio"
            className="relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/80 via-blue-900/80 to-cyan-900/80 p-4 shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md">
                    <TrendingUp className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-white">{title}</h3>
                {topItems.length > 0 ? (
                    <div className="flex w-full gap-1">
                        {topItems.map((item) => (
                            <div key={item.id} className="relative aspect-square flex-1 overflow-hidden rounded-lg">
                                {item.imageUrl ? (
                                    <Image
                                        src={item.imageUrl}
                                        alt={item.title}
                                        fill
                                        sizes="80px"
                                        className="object-cover"
                                        loading="lazy"
                                    />
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[10px] leading-tight text-white/60">인기 검색 타투 보기</p>
                )}
            </div>
        </Link>
    );
}

function SimilarityCard({ item }: Readonly<{ item: SimilarityGalleryItem }>): React.ReactElement {
    const similarityPercent = Math.round(item.similarity * 100);

    return (
        <Link
            href={`/portfolios/${item.portfolioId}`}
            className="group inline-block w-[140px] align-top whitespace-normal mr-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
        >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                {item.imageUrl ? (
                    <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        sizes="(max-width: 767px) 50vw, 180px"
                        className="object-cover transition-transform group-hover:scale-105 group-focus-visible:scale-105"
                        loading="lazy"
                    />
                ) : null}
                <div className="absolute right-1.5 top-1.5 rounded-full bg-orange-700 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    {similarityPercent}%
                </div>
            </div>
            <div className="mt-1.5 space-y-1">
                <UserAvatar name={item.artistName} imageSrc={item.artistProfileImage} />
                <p className="truncate text-xs font-medium transition-colors group-hover:text-brand-primary group-focus-visible:text-brand-primary">
                    {item.title}
                </p>
                <PriceDisplay
                    price={item.price}
                    priceOrigin={item.priceOrigin}
                    discountRate={item.discountRate}
                />
            </div>
        </Link>
    );
}
