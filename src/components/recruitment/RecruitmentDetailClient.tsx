// @client-reason: interactive detail view with apply/edit/delete actions
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, User, Clock, MapPin, Pencil, Trash2, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { deleteRecruitment } from "@/lib/actions/recruitment-actions";
import type { RecruitmentDetail } from "@/lib/supabase/home-recruitment-queries";

interface Props {
  recruitment: RecruitmentDetail;
  labels: Record<string, string>;
    isOwner?: boolean;
}

function getDaysLeft(closedAt: string | null): number | null {
  if (!closedAt) return null;
  return Math.max(0, Math.ceil((new Date(closedAt).getTime() - Date.now()) / 86400000));
}

function ImageGallery({ images, title }: Readonly<{ images: string[]; title: string }>): React.ReactElement | null {
  const [current, setCurrent] = useState(0);
  if (images.length === 0) return null;

  return (
    <div className="relative mb-4 aspect-square overflow-hidden rounded-xl bg-muted">
      <Image src={images.at(current) ?? ""} alt={title} fill className="object-cover" unoptimized />
      {images.length > 1 ? (
        <>
          <button type="button" onClick={() => setCurrent((p) => (p - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Previous image">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setCurrent((p) => (p + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Next image">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button key={`dot-${String(i)}`} type="button" onClick={() => setCurrent(i)}
                className={`h-2 w-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${i === current ? "bg-white" : "bg-white/50"}`}
                aria-label={`Image ${String(i + 1)}`} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ArtistCard({ recruitment }: Readonly<{ recruitment: RecruitmentDetail; }>): React.ReactElement {
  return (
    <Link href={`/artists/${recruitment.artistId}`}
      className="mb-4 flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
        {recruitment.artistProfileImage ? (
          <Image src={recruitment.artistProfileImage} alt="" width={48} height={48} className="rounded-full object-cover" unoptimized />
        ) : (
          <User className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{recruitment.artistName}</p>
        {recruitment.artistAddress ? (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{recruitment.artistAddress}</span>
          </p>
        ) : null}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

const ICON_BTN = "flex h-9 flex-1 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";

function BottomBar({ kakaoUrl, contact }: Readonly<{
  kakaoUrl?: string | null; contact?: string | null;
}>): React.ReactElement {
  return (
    <div className="fixed bottom-0 left-1/2 w-full max-w-[767px] -translate-x-1/2 border-t bg-background p-2">
      <div className="flex items-center gap-1.5">
        {kakaoUrl ? (
          <a href={kakaoUrl} target="_blank" rel="noopener noreferrer" className={ICON_BTN} aria-label="카카오톡">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.21 4.65 6.58-.15.55-.58 2.07-.66 2.39-.1.4.15.39.31.28.13-.08 2.02-1.37 2.84-1.93.9.13 1.83.2 2.79.2 5.52 0 10-3.58 10-7.52C22 6.58 17.52 3 12 3z" />
            </svg>
          </a>
        ) : null}
        {contact ? (
          <a href={`tel:${contact}`} className={`${ICON_BTN} text-foreground`} aria-label="전화">
            <Phone className="h-4 w-4" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function InfoTags({ recruitment, labels }: Readonly<{ recruitment: RecruitmentDetail; labels: Record<string, string> }>): React.ReactElement {
  const daysLeft = getDaysLeft(recruitment.closedAt);
  const isFree = recruitment.expense === 0;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {recruitment.parts ? (
        <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          {recruitment.parts}
        </span>
      ) : null}
      <span className={`rounded-md px-2 py-1 text-xs font-medium ${isFree ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
        {isFree ? labels.free : `${recruitment.expense.toLocaleString()}원`}
      </span>
      {daysLeft !== null ? (
        <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {labels.dDay.replace("{days}", String(daysLeft))}
        </span>
      ) : null}
    </div>
  );
}

function OwnerActions({ recruitmentId, labels }: Readonly<{
  recruitmentId: string; labels: Record<string, string>; }>): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(): void {
    if (!globalThis.confirm(labels.deleteConfirm ?? "삭제하시겠습니까?")) return;
    startTransition(async () => {
      const result = await deleteRecruitment(recruitmentId);
      if (result.success) {
        router.push("/recruitment");
      }
    });
  }

  return (
    <div className="mt-4 flex gap-2">
      <button type="button" onClick={() => router.push(`/recruitment/edit/${recruitmentId}`)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Pencil className="h-4 w-4" aria-hidden="true" />
        {labels.edit ?? "수정"}
      </button>
      <button type="button" onClick={handleDelete} disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {labels.delete ?? "삭제"}
      </button>
    </div>
  );
}

export function RecruitmentDetailClient({ recruitment, labels, isOwner = false }: Readonly<Props>): React.ReactElement {
  const router = useRouter();

  return (
    <div className="flex flex-col pb-24">
      <button type="button" onClick={() => router.push("/recruitment")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={labels.goBack ?? "Go back"}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {labels.listTitle}
      </button>

      <ImageGallery images={recruitment.artistImages} title={recruitment.title} />

      <h1 className="mb-3 text-xl font-bold">{recruitment.title}</h1>
      <InfoTags recruitment={recruitment} labels={labels} />

      {recruitment.condition ? (
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-medium">{labels.condition}</h3>
          <p className="text-sm text-muted-foreground">{recruitment.condition}</p>
        </div>
      ) : null}

      {recruitment.description ? (
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-medium">{labels.description}</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{recruitment.description}</p>
        </div>
      ) : null}

      <ArtistCard recruitment={recruitment} />

      {isOwner ? <OwnerActions recruitmentId={recruitment.id} labels={labels} /> : null}

      <BottomBar kakaoUrl={recruitment.artistKakaoUrl} contact={recruitment.artistContact} />
    </div>
  );
}
