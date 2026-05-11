// @client-reason: Dynamic review list with pagination
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Star,
    ChevronDown,
    MessageSquare,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ───────────────────────────────────────────────

interface ReviewItem {
    id: string;
    rating: number;
    content: string | null;
    created_at: string;
    artist_id: string;
    artist: { title: string; profile_image_path: string | null } | null;
}

// ─── Star Display ────────────────────────────────────────

function StarRating({ rating }: Readonly<{ rating: number }>): React.ReactElement {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <Star
                    key={s}
                    className={`h-4 w-4 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`}
                />
            ))}
            <span className="ml-1 text-sm font-semibold text-foreground">{rating}.0</span>
        </div>
    );
}

// ─── Review Card ─────────────────────────────────────────

function ReviewCard({ review }: Readonly<{ review: ReviewItem }>): React.ReactElement {
    const date = new Date(review.created_at);

    return (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            {/* Artist + Rating row */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-bold text-foreground">
                        {review.artist?.title ?? "알 수 없는 아티스트"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {date.toLocaleDateString("ko-KR")} {date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                </div>
                <StarRating rating={review.rating} />
            </div>

            {/* Content */}
            {review.content ? (
                <p className="mt-3 text-sm leading-relaxed text-foreground">{review.content}</p>
            ) : (
                <p className="mt-3 text-sm italic text-muted-foreground">작성된 내용이 없습니다.</p>
            )}
        </div>
    );
}

// ─── Loading Spinner ────────────────────────────────────

function LoadingSpinner(): React.ReactElement {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
    );
}

// ─── Page Header ────────────────────────────────────────

function ReviewsHeader({ total, onBack }: Readonly<{ total: number; onBack: () => void }>): React.ReactElement {
    return (
        <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-4">
            <button onClick={onBack} className="rounded-lg p-2 transition-colors hover:bg-muted focus-visible:bg-muted" aria-label="뒤로 가기">
                <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="ml-2 text-lg font-bold text-foreground">나의 리뷰</h1>
            <span className="ml-auto text-sm text-muted-foreground">{total}건</span>
        </header>
    );
}

// ─── Empty State ────────────────────────────────────────

function EmptyReviews(): React.ReactElement {
    return (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">작성한 리뷰가 없습니다.</p>
        </div>
    );
}

// ─── Load More Button ───────────────────────────────────

function LoadMoreButton({ remaining, loading: isLoading, onLoad }: Readonly<{ remaining: number; loading: boolean; onLoad: () => void }>): React.ReactElement {
    return (
        <button
            onClick={onLoad}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:bg-muted disabled:opacity-50"
        >
            {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            ) : (
                <>
                    <ChevronDown className="h-4 w-4" /> 더 보기 ({remaining}건 남음)
                </>
            )}
        </button>
    );
}

// ─── Main Page ──────────────────────────────────────────

const PAGE_SIZE = 20;

function useReviews(authLoading: boolean, user: unknown): {
    reviews: ReviewItem[]; total: number; loading: boolean; loadingMore: boolean; handleLoadMore: () => Promise<void>;
} {
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchReviews = useCallback(async (offset: number, append: boolean): Promise<void> => {
        const res = await fetch(`/api/reviews/my?limit=${PAGE_SIZE}&offset=${offset}`);
        if (!res.ok) return;
        const data = await res.json() as { reviews: ReviewItem[]; total: number };
        setReviews(prev => append ? [...prev, ...data.reviews] : data.reviews);
        setTotal(data.total);
    }, []);

    useEffect(() => {
        if (!authLoading && user) {
            let cancelled = false;
            (async (): Promise<void> => {
                await fetchReviews(0, false);
                if (!cancelled) setLoading(false);
            })();
            return () => { cancelled = true; };
        }
        return undefined;
    }, [authLoading, user, fetchReviews]);

    const handleLoadMore = async (): Promise<void> => {
        setLoadingMore(true);
        await fetchReviews(reviews.length, true);
        setLoadingMore(false);
    };

    return { reviews, total, loading, loadingMore, handleLoadMore };
}

export default function MyReviewsPage(): React.ReactElement {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const { reviews, total, loading, loadingMore, handleLoadMore } = useReviews(authLoading, user);

    if (authLoading || loading) return <LoadingSpinner />;

    return (
        <div className="mx-auto w-full max-w-[767px] pb-20">
            <ReviewsHeader total={total} onBack={() => router.back()} />
            <div className="space-y-3 p-4">
                {reviews.length === 0 ? (
                    <EmptyReviews />
                ) : (
                    reviews.map(review => <ReviewCard key={review.id} review={review} />)
                )}
                {reviews.length < total && (
                    <LoadMoreButton remaining={total - reviews.length} loading={loadingMore} onLoad={handleLoadMore} />
                )}
            </div>
        </div>
    );
}
