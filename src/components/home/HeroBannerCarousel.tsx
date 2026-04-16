// @client-reason: timer-driven banner rotation with CSS transitions
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HeroBannerData } from "./banner-types";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 4000;

interface HeroBannerCarouselProps {
  banners: HeroBannerData[];
}

export function HeroBannerCarousel({ banners }: Readonly<HeroBannerCarouselProps>): React.ReactElement {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    const timer = setInterval(next, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div className="px-4 pt-3 pb-1">
      <div className="relative h-[160px] overflow-hidden rounded-2xl shadow-xl lg:h-[200px]">
        {banners.map((banner, i) => {
          const isActive = i === current;
          const href = banner.link_url ?? "/exhibition";

          return (
            <Link
              key={banner.id}
              href={href}
              aria-hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
              className={cn(
                "group absolute inset-0 block transition-opacity duration-700 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? "z-10 opacity-100" : "z-0 opacity-0",
              )}
            >
              <div className="pointer-events-none absolute inset-0">
                <Image
                  src={banner.image_path}
                  alt={banner.title}
                  fill
                  sizes="(max-width: 767px) 100vw, 767px"
                  className={cn(
                    "object-cover transition-transform duration-[4000ms] ease-linear",
                    isActive ? "scale-[1.08]" : "scale-100",
                  )}
                  quality={65}
                  priority={i === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
              </div>
              <div className="relative z-10 flex h-full items-center gap-5 px-4 lg:px-10">
                <div className="min-w-0 flex-1">
                  {banner.title ? (
                    <h2 className="text-lg font-extrabold leading-tight text-white drop-shadow-lg lg:text-xl">
                      {banner.title}
                    </h2>
                  ) : null}
                  {banner.subtitle ? (
                    <p className="mt-1 text-xs text-white/80 drop-shadow lg:text-sm">{banner.subtitle}</p>
                  ) : null}
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 transition-all group-hover:bg-white/30 group-focus-visible:bg-white/30">
                  <ArrowRight className="h-5 w-5 text-white transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" aria-hidden="true" />
                </div>
              </div>
            </Link>
          );
        })}

        {/* Dots indicator */}
        {banners.length > 1 ? (
          <div className="absolute bottom-2.5 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`배너 ${String(i + 1)}`}
                className={cn(
                  "h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  i === current ? "w-4 bg-white" : "w-1.5 bg-white/40",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
