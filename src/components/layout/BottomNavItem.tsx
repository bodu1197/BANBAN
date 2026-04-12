// @client-reason: usePathname hook for active state styling
"use client";

import { memo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BottomNavItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  badge?: React.ReactNode;
}

export const BottomNavItem = memo(function BottomNavItem({
  href,
  label,
  icon: Icon,
  isActive,
  badge,
}: Readonly<BottomNavItemProps>): React.ReactElement {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
        isActive
          ? "text-brand-primary"
          : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="relative">
        <Icon className={cn("h-5 w-5", isActive && "fill-brand-primary/20")} />
        {badge}
      </span>
      <span>{label}</span>
    </Link>
  );
});
