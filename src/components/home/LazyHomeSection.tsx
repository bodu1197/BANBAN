import { ReactNode } from "react";

type ReservedHeight = "sm" | "md" | "lg";

interface LazyHomeSectionProps {
  children: ReactNode;
  /** Intrinsic size bucket used only while offscreen — sm=300px, md=400px, lg=500px. Defaults to lg. */
  size?: ReservedHeight;
}

// Static class maps so Tailwind's JIT can detect them.
// contain-intrinsic-size만 사용: 오프스크린일 때 레이아웃용 예약 크기. 렌더링 후에는 실제 높이로 축소.
const SIZE_CLASS: Record<ReservedHeight, string> = {
  sm: "[contain-intrinsic-size:auto_300px]",
  md: "[contain-intrinsic-size:auto_400px]",
  lg: "[contain-intrinsic-size:auto_500px]",
};

/**
 * Below-fold home section wrapper.
 * Uses CSS `content-visibility: auto` to skip rendering work for off-screen sections,
 * paired with `contain-intrinsic-size` so the page layout stays stable.
 */
export function LazyHomeSection({
  children,
  size = "lg",
}: Readonly<LazyHomeSectionProps>): React.ReactElement {
  return (
    // eslint-disable-next-line security/detect-object-injection -- size is a typed union, not user input
    <div className={`w-full [content-visibility:auto] ${SIZE_CLASS[size]}`}>
      {children}
    </div>
  );
}
