import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Star, MessageSquare } from "lucide-react";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { fetchAllReviews, getAvatarUrl, type ReviewWithArtist } from "@/lib/supabase/queries";

export async function generateReviewsMetadata(): Promise<Metadata> {
    return {
        title: STRINGS.common.reviews,
        description: `${STRINGS.common.reviews} - HowTattoo`,
        alternates: getAlternates("/reviews"),
    };
}

function StarRating({ rating }: Readonly<{ rating: number }>): React.ReactElement {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <Star
                    key={s}
                    className={`h-3.5 w-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-600"}`}
                />
            ))}
        </div>
    );
}

function getLocalizedContent(review: ReviewWithArtist): string {
    return review.content ?? "";
}

function getArtistDisplayName(artist: ReviewWithArtist["artist"]): string {
    return artist?.title ?? artist?.profiles?.nickname ?? "아티스트";
}

function ReviewCard({ review }: Readonly<{ review: ReviewWithArtist }>): React.ReactElement {
    const date = new Date(review.created_at as string);
    const artistName = getArtistDisplayName(review.artist);
    const reviewerName = review.profile?.nickname ?? "익명";
    const content = getLocalizedContent(review);
    const artistId = review.artist_id;
    const avatarUrl = getAvatarUrl(review.artist?.profile_image_path ?? null);

    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
                <Link
                    href={`/artists/${artistId}`}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                        {avatarUrl ? (
                            <Image src={avatarUrl} alt={artistName} fill className="object-cover" sizes="36px" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                {artistName.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-brand-primary hover:underline focus-visible:underline">
                            {artistName}
                        </span>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {reviewerName} · {date.toLocaleDateString("ko-KR")}
                        </p>
                    </div>
                </Link>
                <StarRating rating={review.rating} />
            </div>
            {content ? (
                <p className="mt-2 text-sm leading-relaxed text-foreground">{content}</p>
            ) : null}
        </div>
    );
}

export async function renderReviewsPage(): Promise<React.ReactElement> {
    const { data: reviews, count } = await fetchAllReviews({ limit: 50 });

    return (
        <div className="mx-auto w-full max-w-[767px]">
            <header className="flex items-center gap-3 border-b border-border px-4 py-4">
                <MessageSquare className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                <h1 className="text-lg font-bold">{STRINGS.common.reviews}</h1>
                <span className="ml-auto text-sm text-muted-foreground">{count}건</span>
            </header>
            <div className="space-y-3 p-4">
                {reviews.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card py-16 text-center">
                        <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/30" />
                        <p className="mt-3 text-sm text-muted-foreground">리뷰가 없습니다.</p>
                    </div>
                ) : (
                    reviews.map(review => <ReviewCard key={review.id} review={review} />)
                )}
            </div>
        </div>
    );
}
