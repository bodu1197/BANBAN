import Link from "next/link";
import {
  Sparkles,
  LayoutGrid,
  Search,
  Percent,
  GraduationCap,
  Crown,
  BookOpen,
  UserSearch,
} from "lucide-react";
import { STRINGS } from "@/lib/strings";

type QuickMenuLabels = typeof STRINGS.quickMenu;

interface QuickMenuProps {
  labels?: QuickMenuLabels;
}

type LucideIcon = typeof Sparkles;

interface MenuItem {
  key: keyof QuickMenuLabels;
  icon: LucideIcon;
  path: string | null;
  highlight?: boolean;
  hot?: boolean;
}

const menuItems: MenuItem[] = [
  { key: "exhibition", icon: LayoutGrid, path: "exhibition", highlight: true },
  { key: "womenBeauty", icon: Sparkles, path: "women-beauty" },
  { key: "mensBeauty", icon: Crown, path: "mens-beauty" },
  { key: "artistSearch", icon: Search, path: "artists" },
  { key: "discount", icon: Percent, path: "discount", hot: true },
  { key: "artistInsight", icon: UserSearch, path: "artist-insight" },
  { key: "course", icon: GraduationCap, path: "courses" },
  { key: "blog", icon: BookOpen, path: "blog" },
];

function getIconBgClass(item: MenuItem): string {
  if (item.highlight) return "bg-orange-500";
  if (item.hot) return "bg-orange-500 animate-pulse";
  return "bg-muted";
}

function QuickMenuItem({ item, label }: Readonly<{
  item: MenuItem; label: string;
}>): React.ReactElement {
  const Icon = item.icon;
  const isAvailable = item.path !== null;
  const href = isAvailable ? `/${item.path as string}` : "#";
  const isAccented = item.highlight || item.hot;

  return (
    <Link
      href={href}
      aria-disabled={!isAvailable}
      tabIndex={isAvailable ? undefined : -1}
      className={`flex flex-col items-center gap-1.5 rounded-lg p-1 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isAvailable
          ? "hover:text-brand-primary focus-visible:text-brand-primary"
          : "pointer-events-none opacity-40"
      }`}
    >
      <div className="relative">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${getIconBgClass(item)}`}>
          <Icon className={`h-5 w-5 ${isAccented ? "text-white" : ""}`} aria-hidden="true" />
        </div>
        {item.hot ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            HOT
          </span>
        ) : null}
      </div>
      <span className={`text-xs font-medium ${isAccented ? "text-orange-500" : ""}`}>{label}</span>
    </Link>
  );
}

export function QuickMenu({
  labels = STRINGS.quickMenu,
}: Readonly<QuickMenuProps> = {}): React.ReactElement {
  return (
    <nav
      className="grid grid-cols-5 gap-y-4 px-4 py-6"
      aria-label="Quick menu"
    >
      {menuItems.map((item) => (
        <QuickMenuItem key={item.key} item={item} label={labels[item.key]} />
      ))}
    </nav>
  );
}
