import { ReactNode } from "react";

type ReservedHeight = "sm" | "md" | "lg";

interface LazyHomeSectionProps {
  children: ReactNode;
  /** Reserved layout height bucket — sm=300px, md=400px, lg=500px. Defaults to lg. */
  size?: ReservedHeight;
}

// Static class maps so Tailwind's JIT can detect them.
const SIZE_CLASS: Record<ReservedHeight, string> = {
  sm: "min-h-[300px] [contain-intrinsic-size:auto_300px]",
  md: "min-h-[400px] [contain-intrinsic-size:auto_400px]",
  lg: "min-h-[500px] [contain-intrinsic-size:auto_500px]",
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
