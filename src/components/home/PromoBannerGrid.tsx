import Image from "next/image";
import Link from "next/link";
import { getStorageUrl } from "@/lib/supabase/storage-utils";

interface PromoBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image_path: string;
  link_url: string | null;
  is_active: boolean;
}

interface PromoBannerGridProps {
  banners: readonly PromoBanner[];
}

export function PromoBannerGrid({ banners }: Readonly<PromoBannerGridProps>): React.ReactElement | null {
  const active = banners.filter((b) => b.is_active);
  if (active.length === 0) return null;

  return (
    <section className="px-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        {active.map((banner) => (
          <PromoBannerCard key={banner.id} banner={banner} />
        ))}
      </div>
    </section>
  );
}

function CardContent({ banner, imageUrl }: Readonly<{ banner: PromoBanner; imageUrl: string | null }>): React.ReactElement {
  return (
    <div className="relative aspect-[3/2] w-full bg-muted">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={banner.title}
          fill
          sizes="(max-width: 767px) 50vw, 360px"
          className="object-cover"
          loading="lazy"
        />
      ) : null}
      {banner.title || banner.subtitle ? (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-3">
          {banner.title ? (
            <h3 className="text-sm font-bold leading-tight text-white drop-shadow-sm">
              {banner.title}
            </h3>
          ) : null}
          {banner.subtitle ? (
            <p className="mt-0.5 text-[11px] text-white/80 drop-shadow-sm">
              {banner.subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PromoBannerCard({ banner }: Readonly<{ banner: PromoBanner }>): React.ReactElement {
  const imageUrl = getStorageUrl(banner.image_path);
  const cls = "block overflow-hidden rounded-xl transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (banner.link_url) {
    return (
      <Link href={banner.link_url} className={cls}>
        <CardContent banner={banner} imageUrl={imageUrl} />
      </Link>
    );
  }

  return (
    <div className={cls}>
      <CardContent banner={banner} imageUrl={imageUrl} />
    </div>
  );
}
