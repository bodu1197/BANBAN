// @client-reason: usePathname for active nav link highlighting, useState for badge counts
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, UserCog, Images, LayoutDashboard, ImageIcon, Ticket, Coins, Megaphone, BarChart3, GraduationCap, UserX, MessageSquare, ExternalLink, Home, PhoneCall, BookOpen, FileEdit, UserSearch, MapPin, TrendingUp, Flag, Grid3X3 } from "lucide-react";

// ─── Types ──────────────────────────────────────────────

interface NavItem {
    href: string;
    icon: React.ReactElement;
    label: string;
}

const NAV_ITEMS: NavItem[] = [
    { href: "/admin/ads-semi", icon: <Crown className="h-5 w-5" />, label: "광고 관리" },
    { href: "/admin/analytics", icon: <BarChart3 className="h-5 w-5" />, label: "접속자 현황" },
    { href: "/admin/members", icon: <UserCog className="h-5 w-5" />, label: "회원 관리" },
    { href: "/admin/portfolios", icon: <Images className="h-5 w-5" />, label: "포트폴리오" },
    { href: "/admin/courses", icon: <GraduationCap className="h-5 w-5" />, label: "수강 관리" },
    { href: "/admin/quick-menu", icon: <Grid3X3 className="h-5 w-5" />, label: "퀵 메뉴" },
    { href: "/admin/home-banners", icon: <Home className="h-5 w-5" />, label: "홈 배너" },
    { href: "/admin/hero-banners", icon: <ImageIcon className="h-5 w-5" />, label: "히어로 배너" },
    { href: "/admin/promo-banners", icon: <LayoutDashboard className="h-5 w-5" />, label: "프로모 배너" },
    { href: "/admin/exhibitions", icon: <Ticket className="h-5 w-5" />, label: "기획전 관리" },
    { href: "/admin/points", icon: <Coins className="h-5 w-5" />, label: "포인트 관리" },
    { href: "/admin/announcements", icon: <Megaphone className="h-5 w-5" />, label: "전체 공지" },
    { href: "/admin/dormant-artists", icon: <UserX className="h-5 w-5" />, label: "휴면 계정" },
    { href: "/admin/reports", icon: <Flag className="h-5 w-5" />, label: "신고 관리" },
    { href: "/admin/inquiries", icon: <MessageSquare className="h-5 w-5" />, label: "건의사항" },
    { href: "/admin/contact-clicks", icon: <PhoneCall className="h-5 w-5" />, label: "연락 클릭 현황" },
    // { href: "/admin/chats", icon: <MessagesSquare className="h-5 w-5" />, label: "채팅 모니터링" },
    { href: "/admin/encyclopedia", icon: <BookOpen className="h-5 w-5" />, label: "백과사전 크론" },
    { href: "/admin/blog-cron", icon: <FileEdit className="h-5 w-5" />, label: "블로그 크론" },
    { href: "/admin/insight-cron", icon: <UserSearch className="h-5 w-5" />, label: "인사이트 크론" },
    { href: "/admin/location-seo", icon: <MapPin className="h-5 w-5" />, label: "위치 SEO 크론" },
    { href: "/admin/weekly-trend", icon: <TrendingUp className="h-5 w-5" />, label: "주간 트렌드" },
];

const SIDEBAR_COUNTS_API = "/api/admin/sidebar-counts";

type CountMap = Record<string, number>;

// ─── Badge ─────────────────────────────────────────────

function CountBadge({ count }: Readonly<{ count: number }>): React.ReactElement | null {
    if (count <= 0) return null;
    const label = count > 99 ? "99+" : String(count);
    return (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
            {label}
        </span>
    );
}

// ─── NavLink ────────────────────────────────────────────

function NavLink({ item, isActive, count }: Readonly<{
    item: NavItem; isActive: boolean; count: number;
}>): React.ReactElement {
    return (
        <Link
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:text-white"
            }`}
        >
            {item.icon}
            <span>{item.label}</span>
            <CountBadge count={count} />
        </Link>
    );
}

// ─── useSidebarCounts ──────────────────────────────────

function useSidebarCounts(): CountMap {
    const [counts, setCounts] = useState<CountMap>({});

    useEffect(() => {
        let active = true;

        fetch(SIDEBAR_COUNTS_API)
            .then((res) => (res.ok ? res.json() : null))
            .then((data: { counts: CountMap } | null) => {
                if (active && data) setCounts(data.counts);
            })
            .catch(() => { /* non-fatal */ });

        return () => { active = false; };
    }, []);

    return counts;
}

// ─── AdminSidebar ───────────────────────────────────────

export function AdminSidebar(): React.ReactElement {
    const pathname = usePathname();
    const counts = useSidebarCounts();

    return (
        <aside className="hidden w-60 shrink-0 border-r border-white/10 bg-zinc-900 lg:flex lg:flex-col">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
                <LayoutDashboard className="h-5 w-5 text-brand-primary" />
                <span className="text-sm font-bold text-white">Admin</span>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.href}
                        item={item}
                        isActive={pathname.includes(item.href)}
                        count={counts[item.href] ?? 0}
                    />
                ))}
            </nav>
            <div className="border-t border-white/10 p-3 space-y-1">
                <Link
                    href="/"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <Home className="h-5 w-5" />
                    <span>홈페이지</span>
                    <ExternalLink className="ml-auto h-3.5 w-3.5" />
                </Link>
            </div>
        </aside>
    );
}
