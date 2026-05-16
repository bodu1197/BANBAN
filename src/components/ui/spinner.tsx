import React from "react";

type SpinnerSize = "xs" | "sm" | "md" | "lg";
type SpinnerTone = "brand" | "current" | "muted" | "onDark" | "destructive" | "adminAccent" | "warning";

interface SpinnerProps {
  size?: SpinnerSize;
  tone?: SpinnerTone;
  label?: string;
  className?: string;
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: "h-3 w-3 border-2",
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-2",
};

const TONE_CLASSES: Record<SpinnerTone, string> = {
  brand: "border-brand-primary border-t-transparent",
  current: "border-current border-t-transparent",
  muted: "border-muted-foreground border-t-transparent",
  onDark: "border-white border-t-transparent",
  destructive: "border-destructive border-t-transparent",
  adminAccent: "border-pink-500 border-t-transparent",
  warning: "border-amber-500 border-t-transparent",
};

export function Spinner({
  size = "sm",
  tone = "brand",
  label = "로딩 중",
  className,
}: Readonly<SpinnerProps>): React.ReactElement {
  return (
    <div
      role="status"
      aria-label={label}
      className={`${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} motion-safe:animate-spin rounded-full ${className ?? ""}`.trim()}
    />
  );
}
