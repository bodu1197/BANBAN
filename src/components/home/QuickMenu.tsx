import Link from "next/link";
import Image from "next/image";
import type { QuickMenuItem as QuickMenuItemData } from "@/lib/supabase/banner-queries";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function getIconUrl(iconPath: string): string {
  if (iconPath.startsWith("http")) return iconPath;
  return `${SUPABASE_URL}/storage/v1/object/public/banners/${iconPath}`;
}

function QuickMenuLink({ item }: Readonly<{ item: QuickMenuItemData }>): React.ReactElement {
  const href = item.link_url.startsWith("/") ? item.link_url : `/${item.link_url}`;

  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-lg p-1 text-center transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:text-brand-primary"
    >
      <div className="flex h-12 w-12 items-center justify-center">
        <Image
          src={getIconUrl(item.icon_path)}
          alt={item.label}
          width={48}
          height={48}
          sizes="40px"
          className="h-10 w-10 object-contain"
        />
      </div>
      <span className="text-xs font-semibold text-foreground">
        {item.label}
      </span>
    </Link>
  );
}

interface QuickMenuProps {
  items: QuickMenuItemData[];
}

export function QuickMenu({ items }: Readonly<QuickMenuProps>): React.ReactElement {
  return (
    <nav
      className="grid grid-cols-4 gap-x-2 gap-y-4 px-4 py-6 md:grid-cols-5"
      aria-label="퀵 메뉴"
    >
      {items.map((item) => (
        <QuickMenuLink key={item.id} item={item} />
      ))}
    </nav>
  );
}
