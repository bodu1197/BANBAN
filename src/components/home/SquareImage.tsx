import Image from "next/image";

interface SquareImageProps {
  src: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
}

export function SquareImage({
  src,
  alt,
  className = "",
  sizes = "(max-width: 767px) 150px, 240px",

  priority = false,
  quality = 60,
}: Readonly<SquareImageProps>): React.ReactElement {
  return (
    <div
      className={`relative overflow-hidden rounded-lg aspect-square bg-muted ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          quality={quality}
          className="object-cover"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
        />
      ) : (
        <Image
          src="/icons/default_portfolio_image.png"
          alt={alt}
          fill
          sizes={sizes}
          quality={quality}
          className="object-cover"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
        />
      )}
    </div>
  );
}
