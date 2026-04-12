// @client-reason: Interactive load-more button with onClick handler
"use client";

export default function BlogLoadMore({ hasMore, loading, onLoadMore }: Readonly<{
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}>): React.ReactElement | null {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center px-4 pb-6">
      <button
        onClick={onLoadMore}
        disabled={loading}
        className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {loading ? "로딩 중..." : "더보기"}
      </button>
    </div>
  );
}
