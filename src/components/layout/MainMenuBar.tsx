// @client-reason: usePathname hook for active menu detection
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActiveRoute } from "@/lib/navigation";

interface MainMenuLabels {
  home: string;
  womenBeauty: string;
  mensBeauty: string;
  exhibition: string;
  course: string;
  community: string;
}

interface MainMenuBarProps {
    labels: MainMenuLabels;
}

export function MainMenuBar({
  labels,
}: Readonly<MainMenuBarProps>): React.ReactElement {
  const pathname = usePathname();
  const homePath = "/";

  const menuItems = useMemo(() => [
    { href: homePath, label: labels.home },
    { href: "/exhibition", label: labels.exhibition },
    { href: "/women-beauty", label: labels.womenBeauty },
    { href: "/mens-beauty", label: labels.mensBeauty },
    { href: "/courses", label: labels.course },
    { href: "/community", label: labels.community },
  ], [homePath, labels]);

  const isActive = (href: string): boolean => isActiveRoute(pathname, href, homePath);

  return (
    <nav
      className="mx-auto max-w-[767px] border-t border-border/50"
      aria-label="Main menu"
    >
      <div className="flex items-center overflow-x-auto whitespace-nowrap px-2 scrollbar-hide md:justify-around md:overflow-visible">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "relative shrink-0 px-3 py-3 text-sm font-medium transition-colors md:shrink",
              "hover:text-brand-primary focus-visible:text-brand-primary focus-visible:outline-none",
              isActive(item.href)
                ? "text-brand-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-brand-primary"
                : "text-muted-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
