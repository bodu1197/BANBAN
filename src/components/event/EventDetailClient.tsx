// @client-reason: Image carousel swipe + interactive FAQ accordion (legacy), sticky CTA, back navigation
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { EventWithDetails } from "@/lib/supabase/event-queries";
import type { GeneratedEventContent, GeneratedDetailCopy } from "@/components/event-form/types";
import { getAvatarUrl } from "@/lib/supabase/storage-utils";
import { EventDetailImageStack } from "./EventDetailImageStack";

function hasDetailImages(media: EventWithDetails["event_media"]): boolean {
  return media.some((m) => m.media_type.startsWith("detail_"));
}

function isLegacyContent(obj: unknown): obj is GeneratedEventContent {
  return obj !== null && typeof obj === "object" && "headline" in (obj as Record<string, unknown>);
}

export function EventDetailClient({
  event,
}: Readonly<{ event: EventWithDetails }>): React.ReactElement {
  const detailMedia = event.event_media.filter((m) => m.media_type.startsWith("detail_"));
  const isImageBased = hasDetailImages(event.event_media);

  return (
    <div className="flex flex-col pb-20">
      <EventHeader />

      {isImageBased ? (
        <ImageBasedView event={event} detailMedia={detailMedia} />
      ) : (
        <LegacyTextView event={event} />
      )}

      <EventBottomBar
        kakaoUrl={event.artist.kakao_url}
        contact={event.artist.contact}
        artistId={event.artist_id}
        eventId={event.id}
      />
    </div>
  );
}

function isDetailCopy(obj: unknown): obj is GeneratedDetailCopy {
  return obj !== null && typeof obj === "object" && "altTexts" in (obj as Record<string, unknown>);
}

function ImageBasedView({
  event,
  detailMedia,
}: Readonly<{
  event: EventWithDetails;
  detailMedia: EventWithDetails["event_media"];
}>): React.ReactElement {
  const copy = isDetailCopy(event.ai_generated_content) ? event.ai_generated_content : null;

  return (
    <>
      {/* SEO Text Header */}
      <header className="mx-auto max-w-3xl space-y-2 px-4 py-4">
        <p className="text-xs text-muted-foreground">{event.procedure_name}</p>
        <h1 className="text-xl font-bold text-foreground">{event.title}</h1>
        <div className="flex items-center gap-3">
          {(event.discount_rate ?? 0) > 0 && (
            <span className="rounded-md bg-red-500 px-2 py-0.5 text-sm font-bold text-white">
              {event.discount_rate}%
            </span>
          )}
          <div className="flex items-baseline gap-2">
            {(event.discount_rate ?? 0) > 0 && (
              <span className="text-xs text-muted-foreground line-through">
                {event.price_origin.toLocaleString()}원
              </span>
            )}
            <span className="text-lg font-bold">{event.price.toLocaleString()}원</span>
          </div>
        </div>
        {event.procedure_summary && (
          <p className="text-sm text-muted-foreground">{event.procedure_summary}</p>
        )}
      </header>

      {/* AI-generated Image Stack */}
      <EventDetailImageStack sections={detailMedia} />

      {/* SEO hidden text from detail copy — crawlable by search engines */}
      {copy?.sections && (
        <aside className="sr-only">
          <h2>{copy.sections.detail_intro?.heading}</h2>
          <p>{copy.sections.detail_intro?.bodyText}</p>
          <ul>
            {copy.sections.detail_intro?.benefits.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
          <h2>{copy.sections.detail_audience?.heading}</h2>
          <ul>
            {copy.sections.detail_audience?.items.map((item, i) => <li key={i}>{item.text}</li>)}
          </ul>
          <h2>{copy.sections.detail_process?.heading}</h2>
          <ol>
            {copy.sections.detail_process?.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          {copy.sections.detail_shop && (
            <>
              <h2>{copy.sections.detail_shop.heading}</h2>
              <ul>
                {copy.sections.detail_shop.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </>
          )}
        </aside>
      )}

      {/* Artist Mini Card */}
      <div className="mx-auto max-w-3xl px-4 py-5">
        <ArtistMiniCard event={event} />
      </div>
    </>
  );
}

function LegacyTextView({
  event,
}: Readonly<{ event: EventWithDetails }>): React.ReactElement {
  const [currentImage, setCurrentImage] = useState(0);
  const aiContent = isLegacyContent(event.ai_generated_content) ? event.ai_generated_content : null;
  const media = event.event_media;
  const discountRate = event.discount_rate ?? 0;
  const heroImages = media.length > 0 ? media : [];

  return (
    <>
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
                    i === currentImage ? "bg-white focus-visible:ring-white" : "bg-white/40 hover:bg-white/70 focus-visible:bg-white/70 focus-visible:ring-white"
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
                  <summary className="cursor-pointer rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
            {event.shop_name && <p className="font-medium">{event.shop_name}</p>}
            {event.shop_region && <p className="text-muted-foreground">{event.shop_region}</p>}
            {event.shop_business_hours && <p className="text-muted-foreground">영업시간: {event.shop_business_hours}</p>}
            {event.shop_parking && <p className="text-muted-foreground">주차: {event.shop_parking}</p>}
            {event.shop_booking_method && <p className="text-muted-foreground">예약: {event.shop_booking_method}</p>}
          </div>
        </section>

        {/* Artist Mini Card */}
        <ArtistMiniCard event={event} />
      </div>
    </>
  );
}

function EventHeader(): React.ReactElement {
  const router = useRouter();

  const handleShare = (): void => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(globalThis.location.origin + globalThis.location.pathname);
      toast.success("링크가 복사되었습니다");
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background px-2 py-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        aria-label="뒤로 가기"
        className="min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleShare}
        aria-label="공유"
        className="min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Share2 className="h-5 w-5" />
      </Button>
    </header>
  );
}

const BASE_BTN = "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const THEME_BTN = `${BASE_BTN} border-border bg-background text-foreground hover:bg-muted focus-visible:bg-muted`;
const KAKAO_BTN = `${BASE_BTN} border-transparent bg-brand-kakao text-brand-kakao-foreground hover:brightness-95 focus-visible:brightness-95`;

function trackContactClick(artistId: string, clickType: "kakao" | "phone", sourceId: string): void {
  void fetch("/api/contact-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artistId, clickType, sourcePage: "event", sourceId }),
    keepalive: true,
  });
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isSafePhone(phone: string): boolean {
  return /^[\d\-+() ]+$/.test(phone);
}

function EventBottomBar({ kakaoUrl, contact, artistId, eventId }: Readonly<{
  kakaoUrl?: string | null;
  contact?: string | null;
  artistId: string;
  eventId: string;
}>): React.ReactElement | null {
  const safeKakao = kakaoUrl && isSafeUrl(kakaoUrl) ? kakaoUrl : null;
  const safeContact = contact && isSafePhone(contact) ? contact : null;

  if (!safeKakao && !safeContact) return null;

  return (
    <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[1024px] -translate-x-1/2 border-t bg-background p-2">
      <div className="flex items-center gap-1.5">
        {safeKakao ? (
          <a
            href={safeKakao}
            target="_blank"
            rel="noopener noreferrer"
            className={KAKAO_BTN}
            aria-label="카카오톡 상담"
            onClick={() => trackContactClick(artistId, "kakao", eventId)}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.21 4.65 6.58-.15.55-.58 2.07-.66 2.39-.1.4.15.39.31.28.13-.08 2.02-1.37 2.84-1.93.9.13 1.83.2 2.79.2 5.52 0 10-3.58 10-7.52C22 6.58 17.52 3 12 3z" />
            </svg>
            카카오톡
          </a>
        ) : null}
        {safeContact ? (
          <a
            href={`tel:${safeContact}`}
            className={THEME_BTN}
            aria-label="전화 상담"
            onClick={() => trackContactClick(artistId, "phone", eventId)}
          >
            <Phone className="h-4 w-4" />
            전화
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ArtistMiniCard({ event }: Readonly<{ event: EventWithDetails }>): React.ReactElement {
  return (
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
  );
}
