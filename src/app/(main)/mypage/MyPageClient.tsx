// @client-reason: Interactive mypage with user state, different views for user vs artist
"use client";
import { STRINGS } from "@/lib/strings";
import { useState, useEffect } from "react";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Images,
  Heart,
  Star,
  Pencil,
  Store,
  BarChart3,
  Settings,
  Users,
  GraduationCap,
  MessageSquarePlus,
  ShoppingCart,
} from "lucide-react";
import { PointCoinIcon } from "@/components/icons/PointCoinIcon";
import { useAuth } from "@/hooks/useAuth";
import { getAvatarUrl } from "@/lib/supabase/storage-utils";
import {
  fetchLikedPortfolios,
  fetchLikedArtists,
  type LikedPortfolio,
  type LikedArtist,
} from "@/lib/supabase/likes-queries";
import { AnnouncementsBanner } from "@/components/mypage/AnnouncementsBanner";
const DEFAULT_PROFILE_IMAGE = "/images/default_profile.svg";

type IconComponent = React.ComponentType<{ className?: string }>;

interface QuickMenuItem {
  icon: IconComponent;
  href: string;
  label: string;
}

const m = STRINGS.mypage;

const userMenuItems: QuickMenuItem[] = [
  { icon: PointCoinIcon, href: "/mypage/points", label: m.pointManage },
  { icon: Heart, href: "/likes", label: m.likedPosts },
  { icon: Star, href: "/mypage/reviews", label: m.myReviews },
  { icon: MessageSquarePlus, href: "/mypage/inquiries", label: m.inquiries },
];

const artistMenuItems: QuickMenuItem[] = [
  { icon: Images, href: "/mypage/artist/portfolios", label: m.portfolioManage },
  { icon: Pencil, href: "/mypage/artist/before-after", label: m.beforeAfterManage },
  { icon: GraduationCap, href: "/mypage/artist/courses", label: m.courseManage },
  { icon: Users, href: "/community?board=RECRUITMENT", label: m.findModel },
  { icon: ShoppingCart, href: "/mypage/artist/ads/purchase", label: m.adPurchase },
  { icon: BarChart3, href: "/mypage/artist/ads", label: m.adManage },
  { icon: PointCoinIcon, href: "/mypage/points", label: m.pointManage },
  { icon: MessageSquarePlus, href: "/mypage/inquiries", label: m.inquiries },
];

// --- Shared Components ---

function MyPageHeader({ onLogout }: Readonly<{
  onLogout: () => void;
}>): React.ReactElement {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center">
        <Link
          href={"/"}
          className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="ml-1 text-lg font-semibold">{STRINGS.common.mypage}</h1>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={STRINGS.common.logout}
      >
        <LogOut className="h-6 w-6" />
      </button>
    </header>
  );
}

function QuickMenu({ items }: Readonly<{
  items: QuickMenuItem[];
}>): React.ReactElement {
  return (
    <div className="mt-5 grid grid-cols-4 gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-col items-center gap-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-muted">
            <item.icon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="break-keep text-center text-xs text-muted-foreground">
            {item.label}
          </p>
        </Link>
      ))}
    </div>
  );
}

function LikedSection({ title, children, noData, isEmpty }: Readonly<{
  title: string;
  children: React.ReactNode;
  noData: string;
  isEmpty: boolean;
}>): React.ReactElement {
  return (
    <div className="bg-background p-4">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {isEmpty
        ? <p className="py-8 text-center text-sm text-muted-foreground">{noData}</p>
        : children}
    </div>
  );
}

// --- User View ---

function useLikedData(userId: string): { portfolios: LikedPortfolio[]; artists: LikedArtist[] } {
  const [portfolios, setPortfolios] = useState<LikedPortfolio[]>([]);
  const [artists, setArtists] = useState<LikedArtist[]>([]);
  useEffect(() => {
    let mounted = true;
    Promise.all([fetchLikedPortfolios(userId, 6), fetchLikedArtists(userId, 6)])
      .then(([p, a]) => { if (mounted) { setPortfolios(p); setArtists(a); } });
    return () => { mounted = false; };
  }, [userId]);
  return { portfolios, artists };
}

function LikedGrid({ items, basePath, defaultImg }: Readonly<{
  items: { id: string; imageUrl?: string | null; name?: string }[];
  basePath: string; defaultImg: string;
}>): React.ReactElement {
  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((item) => (
        <Link key={item.id} href={`/${basePath}/${item.id}`} className="relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="relative aspect-square">
            <Image src={item.imageUrl ?? defaultImg} alt={item.name ?? ""} fill className="object-cover" sizes="(max-width: 767px) 33vw, 250px" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function UserView({ userId }: Readonly<{
  userId: string;
}>): React.ReactElement {
  const { portfolios, artists } = useLikedData(userId);
  const moreLink = (
    <div className="mt-3 text-center">
      <Link href={"/likes"} className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {STRINGS.mypage.more} +
      </Link>
    </div>
  );

  return (
    <>
      <LikedSection title={STRINGS.mypage.likedPortfolios} noData={STRINGS.common.noData} isEmpty={portfolios.length === 0}>
        <LikedGrid items={portfolios} basePath="portfolios" defaultImg="/placeholder-image.svg" />
        {moreLink}
      </LikedSection>
      <LikedSection title={STRINGS.mypage.likedArtists} noData={STRINGS.common.noData} isEmpty={artists.length === 0}>
        <LikedGrid items={artists} basePath="artists" defaultImg={DEFAULT_PROFILE_IMAGE} />
        {moreLink}
      </LikedSection>
    </>
  );
}

// --- Artist View ---

function ArtistDashboardCard({ icon: Icon, label, value, href }: Readonly<{
  icon: IconComponent;
  label: string;
  value?: string;
  href: string;
  }>): React.ReactElement {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        {value && <p className="text-lg font-bold">{value}</p>}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </Link>
  );
}

function ArtistView({ artistId }: Readonly<{
  artistId: string;
}>): React.ReactElement {
  const d = STRINGS.mypage;
  return (
    <>
      {/* Dashboard Cards – items NOT already in Quick Menu */}
      <div className="space-y-2 bg-background p-4">
        <ArtistDashboardCard icon={Star} label={d.myReviews} href="/mypage/reviews" />
      </div>

      {/* Shop Edit Button */}
      <div className="bg-background p-4">
        <Link
          href={"/mypage/artist/edit"}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Settings className="h-5 w-5" />
          {d.editArtistProfile}
        </Link>
        <Link
          href={`/artists/${artistId}`}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Store className="h-4 w-4" />
          {d.viewMyShop}
        </Link>
      </div>
    </>
  );
}

// --- Hooks ---

interface UserDisplay {
  name: string;
  imageUrl: string;
}

function resolveDisplayName(
  user: { email?: string; user_metadata?: Record<string, unknown> } | null,
  artist: { title: string } | null,
): string {
  if (artist?.title) return artist.title;
  const meta = user?.user_metadata;
  if (meta?.nickname) return meta.nickname as string;
  if (meta?.username) return meta.username as string;
  if (user?.email) return user.email.split("@")[0];
  return "User";
}

function resolveImageUrl(
  user: { user_metadata?: Record<string, unknown> } | null,
  artist: { profile_image_path?: string | null } | null,
): string {
  if (artist?.profile_image_path) {
    return getAvatarUrl(artist.profile_image_path) ?? DEFAULT_PROFILE_IMAGE;
  }
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  return avatarUrl ?? DEFAULT_PROFILE_IMAGE;
}

function useUserDisplay(
  user: { email?: string; user_metadata?: Record<string, unknown> } | null,
  artist: { title: string; profile_image_path?: string | null } | null,
): UserDisplay {
  return {
    name: resolveDisplayName(user, artist),
    imageUrl: resolveImageUrl(user, artist),
  };
}

function useAuthRedirect(): ReturnType<typeof useAuth> {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      router.push("/login");
    }
  }, [auth.isLoading, auth.user, router]);

  return auth;
}

// --- Profile Section ---

function ProfileSection({ display, isArtist }: Readonly<{
  display: UserDisplay;
  isArtist: boolean;
}>): React.ReactElement {
  return (
    <div className="flex items-center">
      <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full">
        <Image src={display.imageUrl} alt={display.name} fill className="object-cover" />
      </div>
      <div className="ml-2.5 min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{display.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2.5">
          <Link
            href={"/mypage/profile"}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="h-4 w-4 opacity-60" />
            {STRINGS.mypage.editProfile}
          </Link>
          {!isArtist && (
            <Link
              href={"/register/artist"}
              className="inline-flex items-center gap-1 rounded-full bg-brand-primary px-3 py-1.5 text-[13px] font-bold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {STRINGS.mypage.artistRegister}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export function MyPageClient(): React.ReactElement {
  const { user, artist, isArtist, isLoading, logout } = useAuthRedirect();
  const display = useUserDisplay(user, artist);
  const handleLogout = async (): Promise<void> => { await logout(); };

  if (isLoading) return <FullPageSpinner />;
  if (!user) return <div />;

  const menu = isArtist ? artistMenuItems : userMenuItems;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[767px] bg-muted/30">
      <MyPageHeader onLogout={handleLogout} />
      <section className="space-y-2.5 pb-20">
        <div className="bg-background p-4 pb-5">
          <ProfileSection display={display} isArtist={isArtist} />
          <QuickMenu items={menu} />
        </div>
        <div className="bg-background px-4 py-3">
          <AnnouncementsBanner />
        </div>
        {isArtist && artist?.id
          ? <ArtistView artistId={artist.id} />
          : <UserView userId={user.id} />}
      </section>
    </div>
  );
}
