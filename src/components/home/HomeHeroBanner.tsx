import Link from "next/link";
import Image from "next/image";
import type { HeroBannerData } from "@/lib/supabase/hero-banner-queries";

interface Props {
  banner: HeroBannerData | null;
}

function normalizeLinkUrl(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed) || trimmed.startsWith("#")) return trimmed;
  return `/${trimmed}`;
}

export function HomeHeroBanner({ banner }: Readonly<Props>): React.ReactElement | null {
  if (!banner) return null;

  const altText = banner.title ?? banner.subtitle ?? "반언니 시즌 배너";
  const href = normalizeLinkUrl(banner.linkUrl);
  const isExternal = href !== null && /^https?:\/\//i.test(href);

  const imageElement = (
    <div className="relative h-full w-full">
      <Image
        src={banner.imageUrl}
        alt={altText}
        fill
        className="object-cover"
        sizes="(min-width: 1024px) 1024px, 100vw"
        priority
        fetchPriority="high"
        referrerPolicy="no-referrer"
      />
      {banner.title || banner.subtitle ? (
        <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end gap-1 p-5 text-white">
          {banner.title ? <h3 className="text-lg font-bold leading-tight [text-shadow:0_2px_8px_rgba(0,0,0,0.7)]">{banner.title}</h3> : null}
          {banner.subtitle ? <p className="text-sm [text-shadow:0_2px_6px_rgba(0,0,0,0.7)]">{banner.subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <section aria-label="히어로 배너" className="px-4">
      <div className="relative w-full overflow-hidden rounded-2xl bg-muted aspect-[3/1]">
        {href ? (
          <Link
            href={href}
            aria-label={`${banner.title ?? "히어로 배너로 이동"}${isExternal ? " (새 탭에서 열림)" : ""}`}
            {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            {imageElement}
          </Link>
        ) : (
          imageElement
        )}
      </div>
    </section>
  );
}
