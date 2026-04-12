// @client-reason: form handling, star rating interaction, search params
"use client";

import { STRINGS } from "@/lib/strings";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitReview } from "@/lib/actions/reviews";
function StarRating({ rating, onRate, label }: Readonly<{ rating: number; onRate: (star: number) => void; label: string }>): React.ReactElement {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">{label}</label>
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        className={`text-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${star <= rating ? "text-yellow-400" : "text-gray-300 hover:text-yellow-200"}`}
                        onClick={() => onRate(star)}
                        aria-label={`${star}점`}
                    >
                        &#9733;
                    </button>
                ))}
            </div>
        </div>
    );
}

function ReviewForm({ rating, content, onRate, onContentChange, isPending }: Readonly<{
    rating: number;
    content: string;
    onRate: (star: number) => void;
    onContentChange: (v: string) => void;
    isPending: boolean;
}>): React.ReactElement {
    return (
        <>
            <StarRating rating={rating} onRate={onRate} label={STRINGS.review.rating} />
            <div className="space-y-2">
                <label htmlFor="content" className="text-sm font-medium">{STRINGS.review.content}</label>
                <Textarea
                    id="content"
                    placeholder={STRINGS.review.contentPlaceholder}
                    value={content}
                    onChange={(e) => onContentChange(e.target.value)}
                    required
                    className="min-h-[150px]"
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">{STRINGS.review.photoAttachment}</label>
                <Input type="file" disabled />
                <p className="text-xs text-muted-foreground">{STRINGS.review.photoUploadComingSoon}</p>
            </div>
            <Button type="submit" className="w-full" disabled={isPending || !content.trim()}>
                {isPending ? STRINGS.common.submitting : STRINGS.review.submitReview}
            </Button>
        </>
    );
}

function ReviewWriteContent(): React.ReactElement {
    const searchParams = useSearchParams();
    const router = useRouter();
    const artistId = searchParams.get("id");
    const [rating, setRating] = useState(5);
    const [content, setContent] = useState("");
    const [isPending, startTransition] = useTransition();

    if (!artistId) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                {STRINGS.review.invalidAccess}
            </div>
        );
    }

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        if (!content.trim() || !artistId) return;
        startTransition(async () => {
            const result = await submitReview(artistId, rating, content);
            if (result.success) {
                toast.success(STRINGS.review.reviewSubmitted);
                router.back();
            } else {
                toast.error(result.error ?? "Failed to submit review");
            }
        });
    }

    return (
        <div className="mx-auto max-w-md space-y-6 p-6">
            <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold">{STRINGS.review.writeReview}</h1>
                <p className="text-muted-foreground">{STRINGS.review.shareExperience}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <ReviewForm
                    rating={rating}
                    content={content}
                    onRate={setRating}
                    onContentChange={setContent}
                    isPending={isPending}
                />
            </form>
        </div>
    );
}

export default function ReviewWriteClient(): React.ReactElement {
    return (
        <Suspense fallback={<div className="p-8 text-center">{STRINGS.common.loading}</div>}>
            <ReviewWriteContent />
        </Suspense>
    );
}
