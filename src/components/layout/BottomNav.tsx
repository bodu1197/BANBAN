// @client-reason: usePathname hook for active route detection in mobile navigation
"use client";

import { STRINGS } from "@/lib/strings";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Home, Heart, User } from "lucide-react";
import { isActiveRoute } from "@/lib/navigation";
import { BottomNavItem } from "./BottomNavItem";
export function BottomNav(): React.ReactElement | null {
  const pathname = usePathname();
  const homePath = "/";
  const navItems = useMemo(() => [
    { href: homePath, label: STRINGS.nav.home, icon: Home },
    { href: "/likes", label: STRINGS.nav.likes, icon: Heart },
    { href: "/mypage", label: STRINGS.nav.mypage, icon: User },
  ], [homePath]);

  // Hide BottomNav on certain pages
  const isHiddenPage = /\/admin(\/|$)/.test(pathname) ||
    /\/(artists|portfolios|courses|recruitment)\/[^/]+$/.test(pathname) ||
    /\/mypage\/(profile|artist\/edit)$/.test(pathname) ||
    /\/register\/artist$/.test(pathname);
  if (isHiddenPage) return null;

  const isActive = (href: string): boolean => isActiveRoute(pathname, href, homePath);

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-[767px] -translate-x-1/2 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      aria-label="Bottom navigation"
    >
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => (
          <BottomNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={isActive(item.href)}
          />
        ))}
      </div>
    </nav>
  );
}
