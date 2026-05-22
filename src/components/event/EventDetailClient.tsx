// @client-reason: Image carousel swipe + interactive FAQ accordion
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { EventWithDetails } from "@/lib/supabase/event-queries";
import type { GeneratedEventContent } from "@/components/event-form/types";
import { getAvatarUrl } from "@/lib/supabase/storage-utils";

export function EventDetailClient({
  event,
}: Readonly<{ event: EventWithDetails }>): React.ReactElement {
  const [currentImage, setCurrentImage] = useState(0);
  const aiContent = event.ai_generated_content as GeneratedEventContent | null;
  const media = event.event_media;
  const discountRate = event.discount_rate ?? 0;

  const heroImages = media.length > 0 ? media : [];

  return (
    <div className="space-y-0">
      {/* Image Carousel */}
      {heroImages.length > 0 && (
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <Image
            src={heroImages[currentImage]?.storage_path ?? ""}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
          {heroImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentImage(i)}
                  className={`h-2 w-2 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    i === currentImage ? "bg-white focus-visible:ring-white" : "bg-white/40 focus-visible:ring-white"
                  }`}
                  aria-label={`이미지 ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-6 px-4 py-5">
        {/* Price Banner */}
        <div className="flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3 dark:bg-red-950/30">
          {discountRate > 0 && (
            <span className="rounded-md bg-red-500 px-2.5 py-1 text-sm font-bold text-white">
              {discountRate}%
            </span>
          )}
          <div className="flex flex-col">
            {discountRate > 0 && (
              <span className="text-xs text-muted-foreground line-through">
                {event.price_origin.toLocaleString()}원
              </span>
            )}
            <span className="text-xl font-bold text-foreground">
              {event.price.toLocaleString()}원
            </span>
          </div>
          {event.event_period_text && (
            <span className="ml-auto text-xs text-muted-foreground">
              {event.event_period_text}
            </span>
          )}
        </div>

        {/* Title + Headline */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{event.procedure_name}</p>
          <h1 className="text-xl font-bold text-foreground">{event.title}</h1>
          {aiContent?.headline && (
            <p className="text-lg font-semibold text-foreground">{aiContent.headline}</p>
          )}
          {aiContent?.subheadline && (
            <p className="text-sm text-muted-foreground">{aiContent.subheadline}</p>
          )}
        </div>

        {/* Info Card */}
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3">
          {event.procedure_duration && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">시술 시간</p>
              <p className="text-sm font-medium">{event.procedure_duration}</p>
            </div>
          )}
          {event.maintenance_period && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">유지 기간</p>
              <p className="text-sm font-medium">{event.maintenance_period}</p>
            </div>
          )}
          {event.retouch_type && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">리터치</p>
              <p className="text-sm font-medium">
                {{ included: "포함", separate: "별도", none: "없음", extra: "추가비" }[event.retouch_type] ?? event.retouch_type}
              </p>
            </div>
          )}
        </div>

        {/* AI Generated Sections */}
        {aiContent?.sections && aiContent.sections.length > 0 && (
          <div className="space-y-6">
            {aiContent.sections.map((section, i) => (
              <section key={i} className="space-y-2">
                <h2 className="text-base font-bold text-foreground">{section.heading}</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        )}

        {/* Target Audience */}
        {aiContent?.targetAudienceExpanded && aiContent.targetAudienceExpanded.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">이런 분께 추천해요</h2>
            <div className="space-y-2">
              {aiContent.targetAudienceExpanded.map((t, i) => (
                <div key={i} className="rounded-lg bg-muted/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {aiContent?.faq && aiContent.faq.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">자주 묻는 질문</h2>
            <div className="space-y-2">
              {aiContent.faq.map((item, i) => (
                <details key={i} className="group rounded-lg border border-input">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
                    {item.question}
                  </summary>
                  <p className="px-4 pb-3 text-sm text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Shop Info */}
        <section className="space-y-3 rounded-lg border border-input p-4">
          <h2 className="text-base font-bold text-foreground">샵 정보</h2>
          <div className="space-y-1.5 text-sm">
            {event.shop_name && (
              <p className="font-medium">{event.shop_name}</p>
            )}
            {event.shop_region && (
              <p className="text-muted-foreground">{event.shop_region}</p>
            )}
            {event.shop_business_hours && (
              <p className="text-muted-foreground">영업시간: {event.shop_business_hours}</p>
            )}
            {event.shop_parking && (
              <p className="text-muted-foreground">주차: {event.shop_parking}</p>
            )}
            {event.shop_booking_method && (
              <p className="text-muted-foreground">예약: {event.shop_booking_method}</p>
            )}
          </div>
        </section>

        {/* Artist Mini Card */}
        <Link
          href={`/artists/${event.artist.id}`}
          className="flex items-center gap-3 rounded-lg border border-input p-4 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted/50"
        >
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
            {event.artist.profile_image_path ? (
              <Image
                src={getAvatarUrl(event.artist.profile_image_path) ?? ""}
                alt={event.artist.title}
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{event.artist.title}</p>
            {event.artist.introduce && (
              <p className="truncate text-xs text-muted-foreground">{event.artist.introduce}</p>
            )}
          </div>
          <svg className="h-5 w-5 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Sticky CTA Footer */}
      <div className="sticky bottom-0 border-t border-input bg-background px-4 py-3">
        <Link
          href={event.artist.kakao_url ?? `tel:${event.artist.contact}`}
          className="block w-full rounded-lg bg-brand-primary py-3 text-center text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {aiContent?.callToAction ?? "상담 예약하기"}
        </Link>
      </div>
    </div>
  );
}
