import Link from "next/link";
import {
  Sparkles,
  LayoutGrid,
  GraduationCap,
  Crown,
  Percent,
  Gift,
  Plus,
} from "lucide-react";
import { STRINGS } from "@/lib/strings";

type QuickMenuLabels = typeof STRINGS.quickMenu;

interface QuickMenuProps {
  labels?: QuickMenuLabels;
}

type LucideIcon = typeof Sparkles;

interface MenuItem {
  id: string;
  labelKey?: keyof QuickMenuLabels;
  icon: LucideIcon;
  path: string | null;
  highlight?: boolean;
  hot?: boolean;
  placeholder?: boolean;
}

const menuItems: MenuItem[] = [
  { id: "exhibition", labelKey: "exhibition", icon: LayoutGrid, path: "exhibition", highlight: true },
  { id: "womenBeauty", labelKey: "womenBeauty", icon: Sparkles, path: "women-beauty" },
  { id: "mensBeauty", labelKey: "mensBeauty", icon: Crown, path: "mens-beauty" },
  { id: "course", labelKey: "course", icon: GraduationCap, path: "courses" },
  { id: "discount", labelKey: "discount", icon: Percent, path: "discount", hot: true },
  { id: "benefits", labelKey: "benefits", icon: Gift, path: "benefits" },
  { id: "empty-1", icon: Plus, path: null, placeholder: true },
];

function getIconBgClass(item: MenuItem): string {
  if (item.highlight) return "bg-orange-500";
  if (item.hot) return "bg-orange-500 animate-pulse";
  if (item.placeholder) return "bg-muted/50 border border-dashed border-muted-foreground/40";
  return "bg-muted";
}

function getIconClass(item: MenuItem): string {
  if (item.highlight || item.hot) return "h-5 w-5 text-white";
  if (item.placeholder) return "h-5 w-5 text-muted-foreground/60";
  return "h-5 w-5";
}

function getLabelClass(item: MenuItem): string {
  if (item.highlight || item.hot) return "text-xs font-medium text-orange-500";
  if (item.placeholder) return "text-xs font-medium text-muted-foreground/60";
  return "text-xs font-medium";
}

function QuickMenuItem({ item, label }: Readonly<{
  item: MenuItem; label: string;
}>): React.ReactElement {
  const Icon = item.icon;
  const isAvailable = item.path !== null;
  const href = isAvailable ? `/${item.path as string}` : "#";

  return (
    <Link
      href={href}
      aria-disabled={!isAvailable}
      aria-label={item.placeholder ? "준비 중" : undefined}
      tabIndex={isAvailable ? undefined : -1}
      className={`flex flex-col items-center gap-1.5 rounded-lg p-1 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isAvailable
          ? "hover:text-brand-primary focus-visible:text-brand-primary"
          : "pointer-events-none opacity-50"
      }`}
    >
      <div className="relative">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${getIconBgClass(item)}`}>
          <Icon className={getIconClass(item)} aria-hidden="true" />
        </div>
        {item.hot ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            HOT
          </span>
        ) : null}
      </div>
      <span className={getLabelClass(item)}>
        {label}
      </span>
    </Link>
  );
}

export function QuickMenu({
  labels = STRINGS.quickMenu,
}: Readonly<QuickMenuProps> = {}): React.ReactElement {
  return (
    <nav
      className="grid grid-cols-4 gap-x-2 gap-y-4 px-4 py-6"
      aria-label="Quick menu"
    >
      {menuItems.map((item) => {
        const label = item.labelKey ? labels[item.labelKey] : "";
        return <QuickMenuItem key={item.id} item={item} label={label} />;
      })}
    </nav>
  );
}
