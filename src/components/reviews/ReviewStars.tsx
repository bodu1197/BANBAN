import { Star } from "lucide-react";

interface ReviewStarsProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md";
}

export function ReviewStars({
  rating,
  maxRating = 5,
  size = "md",
}: Readonly<ReviewStarsProps>): React.ReactElement {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of ${maxRating} stars`}>
      {Array.from({ length: maxRating }, (_, i) => {
        const filled = i < Math.round(rating);
        return (
          <Star
            key={`star-${i.toString()}`}
            className={`${iconSize} ${
              filled
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted-foreground/30"
            }`}
          />
        );
      })}
    </div>
  );
}
