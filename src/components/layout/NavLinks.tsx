// @client-reason: usePathname hook for active route detection
"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/supabase/auth";
import { UserInfoDisplay } from "./UserInfoDisplay";
interface NavItem {
  href: string;
  label: string;
}

interface NavLabels {
  home: string;
  womenBeauty?: string;
  mensBeauty?: string;
  exhibition?: string;
  search: string;
  likes?: string;
  mypage?: string;
}

interface DesktopNavProps {
    labels: NavLabels;
}

interface MobileNavProps {
    labels: NavLabels;
  loginLabel?: string;
  logoutLabel?: string;
  user?: {
    id: string;
    email?: string;
    name?: string;
  } | null;
}

function buildNavItems(
    labels: NavLabels,
  includeMobileOnly: boolean
): NavItem[] {
  const items: NavItem[] = [
    { href: "/", label: labels.home },
  ];

  if (labels.exhibition) {
    items.push({ href: "/exhibition", label: labels.exhibition });
  }
  if (labels.womenBeauty) {
    items.push({ href: "/women-beauty", label: labels.womenBeauty });
  }
  if (labels.mensBeauty) {
    items.push({ href: "/mens-beauty", label: labels.mensBeauty });
  }
  if (includeMobileOnly && labels.likes) {
    items.push({ href: "/likes", label: labels.likes });
  }
  if (includeMobileOnly && labels.mypage) {
    items.push({ href: "/mypage", label: labels.mypage });
  }

  return items;
}

export function DesktopNav({
  labels,
}: Readonly<DesktopNavProps>): React.ReactElement {
  const items = buildNavItems(labels, false);

  return (
    <nav
      className="hidden items-center gap-6 md:flex"
      aria-label="Main navigation"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm font-medium transition-colors hover:text-brand-primary focus-visible:text-brand-primary focus-visible:outline-none"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav({
  labels,
  loginLabel = "Login",
  logoutLabel = "Logout",
  user,
}: Readonly<MobileNavProps>): React.ReactElement {
  const items = buildNavItems(labels, true);
  const handleLogout = async (): Promise<void> => { await signOut(); };

  return (
    <nav className="flex flex-col gap-4 pt-8" aria-label="Mobile navigation">
      {user && (
        <>
          <div className="px-1">
            <UserInfoDisplay name={user.name} email={user.email} />
          </div>
          <Separator />
        </>
      )}
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-lg font-medium transition-colors hover:text-brand-primary focus-visible:text-brand-primary focus-visible:outline-none"
        >
          {item.label}
        </Link>
      ))}
      <Separator />
      {user ? (
        <Button
          variant="ghost"
          className="justify-start gap-2 px-0 text-lg font-medium text-destructive hover:text-destructive focus-visible:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {logoutLabel}
        </Button>
      ) : (
        <Link
          href={"/login"}
          className="flex items-center gap-2 text-lg font-medium transition-colors hover:text-brand-primary focus-visible:text-brand-primary focus-visible:outline-none"
        >
          <LogIn className="h-5 w-5" />
          {loginLabel}
        </Link>
      )}
    </nav>
  );
}
