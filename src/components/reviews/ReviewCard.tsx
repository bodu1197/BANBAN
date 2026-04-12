import { ReviewStars } from "./ReviewStars";

interface ReviewCardProps {
  rating: number;
  content: string;
  authorName: string;
  createdAt: string;
}

const TIME_THRESHOLDS = [
  { max: 1, div: 1, ko: "방금 전", en: "just now", isFixed: true },
  { max: 60, div: 1, ko: "분 전", en: "m ago", isFixed: false },
  { max: 1440, div: 60, ko: "시간 전", en: "h ago", isFixed: false },
  { max: 43200, div: 1440, ko: "일 전", en: "d ago", isFixed: false },
  { max: 525600, div: 43200, ko: "개월 전", en: "mo ago", isFixed: false },
  { max: Infinity, div: 525600, ko: "년 전", en: "y ago", isFixed: false },
] as const;

function formatTimeAgo(dateStr: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
  const unit = TIME_THRESHOLDS.find((t) => minutes < t.max) ?? TIME_THRESHOLDS[TIME_THRESHOLDS.length - 1];
  return unit.isFixed ? unit.ko : `${String(Math.floor(minutes / unit.div))}${unit.ko}`;
}

export function ReviewCard({
  rating,
  content,
  authorName,
  createdAt,
  }: Readonly<ReviewCardProps>): React.ReactElement {
  const timeAgo = formatTimeAgo(createdAt);

  return (
    <article className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ReviewStars rating={rating} size="sm" />
          <span className="text-sm font-medium">{authorName}</span>
        </div>
        <time className="text-xs text-muted-foreground" dateTime={createdAt}>
          {timeAgo}
        </time>
      </div>
      <p className="mt-2 text-sm text-foreground">{content}</p>
    </article>
  );
}
