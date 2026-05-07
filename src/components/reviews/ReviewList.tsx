import { ReviewCard } from "./ReviewCard";
import type { ReviewWithUser } from "@/lib/supabase/queries";

interface ReviewListProps {
  reviews: ReviewWithUser[];
  emptyMessage: string;
  "ko"?: string;
}

export function ReviewList({
  reviews,
  emptyMessage,
  }: Readonly<ReviewListProps>): React.ReactElement {
  if (reviews.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          rating={review.rating}
          content={review.content}
          authorName={review.profile?.nickname ?? "익명"}
          createdAt={review.created_at ?? new Date().toISOString()}
        />
      ))}
    </div>
  );
}
