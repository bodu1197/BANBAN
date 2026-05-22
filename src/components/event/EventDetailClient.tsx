// @client-reason: Image carousel swipe + interactive FAQ accordion (legacy), sticky CTA, tab scroll, collapsible panels
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share2, Phone, ChevronDown, Heart, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THEME_BTN, KAKAO_BTN, PRIMARY_BTN } from "@/components/ui/cta-button-styles";
import { KakaoIcon } from "@/components/ui/KakaoIcon";
import { toast } from "sonner";
import type { EventWithDetails } from "@/lib/supabase/event-queries";
import type { GeneratedEventContent, GeneratedDetailCopy } from "@/components/event-form/types";
import { isLegacyContent, isDetailCopy } from "@/lib/event-content-types";
import { isSafeUrl, isSafePhone, trackContactClick } from "@/lib/contact-utils";
import { EventDetailImageStack } from "./EventDetailImageStack";
import { EventShopCard, type EventShopData } from "./EventShopCard";
import { EVENT_SECTION_IDS } from "./event-section-ids";

const RETOUCH_LABELS: Record<string, string> = {
  included: "포함", separate: "별도", none: "없음", extra: "추가비",
} as const;

function hasDetailImages(media: EventWithDetails["event_media"]): boolean {
  return media.some((m) => m.media_type.startsWith("detail_"));
}

interface EventDetailClientProps {
  event: EventWithDetails;
  shopData: EventShopData;
  heroBanner: React.ReactNode;
}

export function EventDetailClient({
  event,
  shopData,
  heroBanner,
}: Readonly<EventDetailClientProps>): React.ReactElement {
  const detailMedia = event.event_media.filter((m) => m.media_type.startsWith("detail_"));
  const isImageBased = hasDetailImages(event.event_media);

  return (
    <div className="flex flex-col pb-20">
      <EventHeader />

      {heroBanner}

      <section id={EVENT_SECTION_IDS.description} aria-label="이벤트 설명">
        {isImageBased ? (
          <ImageBasedContent event={event} detailMedia={detailMedia} />
        ) : (
          <LegacyTextContent event={event} />
        )}
      </section>

      <section id={EVENT_SECTION_IDS.reviews} aria-label="후기" className="px-4 py-6">
        <ReviewsSection artistId={event.artist_id} artistName={event.artist.title} />
      </section>

      <section id={EVENT_SECTION_IDS.shop} aria-label="샵 정보" className="px-4 pb-6">
        <h2 className="mb-3 text-base font-bold">샵 정보</h2>
        <EventShopCard shop={shopData} />
      </section>

      <EventBottomBar
        kakaoUrl={event.artist.kakao_url}
        contact={event.artist.contact}
        artistId={event.artist_id}
        eventId={event.id}
      />
    </div>
  );
}

function SeoHiddenCopy({ copy }: Readonly<{ copy: GeneratedDetailCopy }>): React.ReactElement | null {
  if (!copy.sections) return null;
  const s = copy.sections;
  return (
    <aside className="sr-only">
      <h3>{s.detail_intro?.heading}</h3>
      <p>{s.detail_intro?.bodyText}</p>
      <ul>{s.detail_intro?.benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>
      <h3>{s.detail_audience?.heading}</h3>
      <ul>{s.detail_audience?.items.map((item, i) => <li key={i}>{item.text}</li>)}</ul>
      <h3>{s.detail_process?.heading}</h3>
      <ol>{s.detail_process?.steps.map((s2, i) => <li key={i}>{s2}</li>)}</ol>
      {s.detail_shop && (
        <>
          <h3>{s.detail_shop.heading}</h3>
          <ul>{s.detail_shop.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
        </>
      )}
    </aside>
  );
}

const COLLAPSED_HEIGHT = 600;

function ExpandableContentArea({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative">
      <div
        className={expanded ? "" : "overflow-hidden"}
        style={expanded ? undefined : { maxHeight: COLLAPSED_HEIGHT }}
      >
        {children}
      </div>
      {expanded ? null : (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center bg-gradient-to-t from-background via-background/95 to-transparent pb-4 pt-24">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border border-border bg-background px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            이벤트 정보 더보기
            <ChevronDown className="ml-1 inline-block h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

function ImageBasedContent({
  event,
  detailMedia,
}: Readonly<{
  event: EventWithDetails;
  detailMedia: EventWithDetails["event_media"];
}>): React.ReactElement {
  const copy = isDetailCopy(event.ai_generated_content) ? event.ai_generated_content : null;

  return (
    <>
      <ExpandableContentArea>
        <EventDetailImageStack sections={detailMedia} />
        <CollapsibleDetailPanel event={event} />
      </ExpandableContentArea>
      {copy ? <SeoHiddenCopy copy={copy} /> : null}
      <div className="mx-auto max-w-3xl px-4 py-3">
        <p className="text-xs text-muted-foreground">
          이 페이지는 {event.shop_name || event.artist.title}에서 운영중입니다.
        </p>
      </div>
    </>
  );
}

function LegacyImageCarousel({
  images,
  title,
}: Readonly<{
  images: EventWithDetails["event_media"];
  title: string;
}>): React.ReactElement | null {
  const [currentImage, setCurrentImage] = useState(0);
  if (images.length === 0) return null;

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
      <Image
        src={images[currentImage]?.storage_path ?? ""}
        alt={title}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 768px"
        priority
      />
      {images.length > 1 && (
        <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentImage(i)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center focus-visible:outline-none"
              aria-label={`이미지 ${i + 1}/${images.length}`}
            >
              <span className={`block h-2 w-2 rounded-full transition-colors ${
                i === currentImage ? "bg-white" : "bg-white/40"
              }`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AiContentSections({ aiContent }: Readonly<{ aiContent: GeneratedEventContent }>): React.ReactElement {
  return (
    <>
      {aiContent.headline && (
        <p className="text-lg font-semibold text-foreground">{aiContent.headline}</p>
      )}
      {aiContent.subheadline && (
        <p className="text-sm text-muted-foreground">{aiContent.subheadline}</p>
      )}
      {aiContent.sections && aiContent.sections.length > 0 && (
        <div className="space-y-6">
          {aiContent.sections.map((section, i) => (
            <section key={i} className="space-y-2">
              <h2 className="text-base font-bold text-foreground">{section.heading}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      )}
      {aiContent.targetAudienceExpanded && aiContent.targetAudienceExpanded.length > 0 && (
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
      {aiContent.faq && aiContent.faq.length > 0 && (
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
    </>
  );
}

function LegacyTextContent({
  event,
}: Readonly<{ event: EventWithDetails }>): React.ReactElement {
  const aiContent = isLegacyContent(event.ai_generated_content) ? event.ai_generated_content : null;

  return (
    <>
      <LegacyImageCarousel images={event.event_media} title={event.title} />
      <div className="space-y-6 px-4 py-5">
        {aiContent ? <AiContentSections aiContent={aiContent} /> : null}
        <InfoCardGrid event={event} />
        <CollapsibleDetailPanel event={event} />
      </div>
    </>
  );
}

function InfoCardGrid({ event }: Readonly<{ event: EventWithDetails }>): React.ReactElement | null {
  const hasAny = event.procedure_duration || event.maintenance_period || event.retouch_type;
  if (!hasAny) return null;

  return (
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
            {RETOUCH_LABELS[event.retouch_type] ?? event.retouch_type}
          </p>
        </div>
      )}
    </div>
  );
}

function toStringArray(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
}

function buildDetailRows(event: EventWithDetails): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  if (event.event_period_text) rows.push({ label: "이벤트 기간", value: event.event_period_text });
  const targets = toStringArray(event.target_audience).join(", ");
  if (targets) rows.push({ label: "추천 대상", value: targets });
  const advantages = toStringArray(event.procedure_advantages).filter(Boolean).join(", ");
  if (advantages) rows.push({ label: "시술 장점", value: advantages });
  if (event.precautions) rows.push({ label: "주의사항", value: event.precautions });
  if (event.retouch_description) rows.push({ label: "리터치 안내", value: event.retouch_description });
  if (event.artist_introduction) rows.push({ label: "아티스트 소개", value: event.artist_introduction });
  return rows;
}

function CollapsibleDetailPanel({
  event,
}: Readonly<{ event: EventWithDetails }>): React.ReactElement {
  const rows = buildDetailRows(event);
  if (rows.length === 0) return <></>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-3">
      <details className="group rounded-lg border border-input" aria-label="시술 상세 정보">
        <summary className="flex w-full cursor-pointer list-none items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="font-medium">시술 정보 더보기</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-3 border-t border-dashed border-input p-4 text-sm">
          {rows.map((row) => (
            <DetailRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      </details>
    </div>
  );
}

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>): React.ReactElement {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-foreground">{value}</p>
    </div>
  );
}

function ReviewsSection({
  artistId,
  artistName,
}: Readonly<{ artistId: string; artistName: string }>): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">후기</h2>
        <Link
          href={`/reviews/write?id=${artistId}`}
          className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Edit2 className="h-3 w-3" aria-hidden />
          후기 작성
        </Link>
      </div>
      <Link
        href={`/artists/${artistId}`}
        className="flex items-center gap-2 rounded-lg border border-input p-4 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Heart className="h-5 w-5 text-brand-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{artistName}의 전체 후기 보기</p>
          <p className="text-xs text-muted-foreground">샵 페이지에서 실제 후기를 확인하세요</p>
        </div>
        <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" aria-hidden />
      </Link>
    </div>
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

function scrollToShop(): void {
  const el = document.getElementById(EVENT_SECTION_IDS.shop);
  if (!el) return;
  const reduced = typeof globalThis.matchMedia === "function"
    && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

function BottomBarButtons({ safeKakao, safeContact, artistId, eventId }: Readonly<{
  safeKakao: string | null;
  safeContact: string | null;
  artistId: string;
  eventId: string;
}>): React.ReactElement {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={scrollToShop} className={THEME_BTN} aria-label="샵 정보 보기">
        샵 정보
      </button>
      {safeKakao ? (
        <a href={safeKakao} target="_blank" rel="noopener noreferrer" className={KAKAO_BTN} aria-label="카카오톡 상담" onClick={() => trackContactClick(artistId, "kakao", "event", eventId)}>
          <KakaoIcon />
          카톡상담
        </a>
      ) : null}
      {safeContact ? (
        <a href={`tel:${safeContact}`} className={PRIMARY_BTN} aria-label="전화 상담" onClick={() => trackContactClick(artistId, "phone", "event", eventId)}>
          <Phone className="h-4 w-4" />
          상담 신청
        </a>
      ) : (
        <Link href={`/artists/${artistId}`} className={PRIMARY_BTN}>상담 신청</Link>
      )}
    </div>
  );
}

function EventBottomBar({ kakaoUrl, contact, artistId, eventId }: Readonly<{
  kakaoUrl?: string | null;
  contact?: string | null;
  artistId: string;
  eventId: string;
}>): React.ReactElement {
  const safeKakao = kakaoUrl && isSafeUrl(kakaoUrl) ? kakaoUrl : null;
  const safeContact = contact && isSafePhone(contact) ? contact : null;

  return (
    <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[1024px] -translate-x-1/2 border-t bg-background p-2">
      <BottomBarButtons safeKakao={safeKakao} safeContact={safeContact} artistId={artistId} eventId={eventId} />
    </div>
  );
}
