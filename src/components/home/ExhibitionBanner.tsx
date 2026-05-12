import Link from "next/link";
import Image from "next/image";

interface ExhibitionBannerProps {
  imageUrl: string;
  linkUrl: string;
  altText: string;
}

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();

export function ExhibitionBanner({ imageUrl, linkUrl, altText }: Readonly<ExhibitionBannerProps>): React.ReactElement {
  const src = imageUrl.startsWith("http") ? imageUrl : `${SUPABASE_URL}/storage/v1/object/public/banners/${imageUrl}`;

  return (
    <Link
      href={linkUrl}
      className="block overflow-hidden rounded-2xl shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Image
        src={src}
        alt={altText}
        width={724}
        height={543}
        sizes="(min-width: 768px) 362px, calc(100vw - 2rem)"
        className="h-auto w-full"
        quality={75}
        priority
        loading="eager"
        fetchPriority="high"
      />
    </Link>
  );
}
