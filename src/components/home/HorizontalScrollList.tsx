import { cn } from "@/lib/utils";

interface HorizontalScrollListProps {
  children: React.ReactNode;
  className?: string;
}

// SSR-only: CSS scroll-snap + native overflow-x-auto. drag-to-scroll(JS) 제거.
// 모바일 touch + PC wheel/scrollbar 만으로 충분 — 홈 페이지에서 6개 인스턴스의
// hydration 비용 0 (이전: useRef + mousemove handler × 6).
export function HorizontalScrollList({
  children,
  className = "",
}: Readonly<HorizontalScrollListProps>): React.ReactElement {
  return (
    <section
      aria-label="Horizontally scrollable content"
      className={cn(
        "overflow-x-auto snap-x scroll-pl-4 whitespace-nowrap pl-4 mr-4 scrollbar-hide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </section>
  );
}
