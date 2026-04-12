// @client-reason: interactive bid submission and artist selection
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, User, Check, MessageCircle, X, Download, ZoomIn, Pencil, Trash2 } from "lucide-react";
import { submitQuoteBid, acceptBid, cancelQuoteRequest } from "@/lib/actions/quote-actions";
import dynamic from "next/dynamic";
const InlineChat = dynamic(
  () => import("@/components/chat/InlineChat").then((m) => ({ default: m.InlineChat })),
  { ssr: false }
);
import type { QuoteRequestDetail } from "@/lib/supabase/quote-queries";

interface Props {
  request: QuoteRequestDetail;
  labels: Record<string, string>;
    isOwner: boolean;
  isArtist: boolean;
  artistId: string | null;
  currentUserId: string | null;
}

function ImageLightbox({ src, onClose }: Readonly<{ src: string; onClose: () => void }>): React.ReactElement {
  async function handleDownload(): Promise<void> {
    const res = await fetch(src);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reference-image.${blob.type.split("/")[1] ?? "jpg"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      onKeyDown={(e): void => { if (e.key === "Escape") onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="이미지 확대"
    >
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e): void => e.stopPropagation()} onKeyDown={undefined} role="presentation">
        <Image src={src} alt="" width={800} height={800} className="max-h-[85vh] w-auto rounded-lg object-contain" unoptimized />
        <div className="absolute right-2 top-2 flex gap-2">
          <button type="button" onClick={(): void => { void handleDownload(); }} aria-label="이미지 다운로드"
            className="rounded-full bg-white/90 p-2 text-black shadow transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Download className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={onClose} aria-label="닫기"
            className="rounded-full bg-white/90 p-2 text-black shadow transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoTag({ label, value }: Readonly<{ label: string; value: string }>): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

function formatBudget(min: number | null, max: number | null, unit: string): string {
  if (min && max) return `${min.toLocaleString()} ~ ${max.toLocaleString()} ${unit}`;
  if (max) return `~ ${max.toLocaleString()} ${unit}`;
  if (min) return `${min.toLocaleString()} ${unit} ~`;
  return "";
}

function RequestInfo({ request, labels }: Readonly<{
  request: QuoteRequestDetail;
  labels: Record<string, string>;
}>): React.ReactElement {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const budget = formatBudget(request.budgetMin, request.budgetMax, labels.budgetUnit);
  return (
    <div className="mb-6 rounded-xl border border-border p-4">
      <h2 className="mb-3 text-lg font-bold">{request.title}</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <InfoTag label={labels.bodyPart} value={request.bodyPart} />
        {request.size ? <InfoTag label={labels.size} value={request.size} /> : null}
        {request.style ? <InfoTag label={labels.style} value={request.style} /> : null}
      </div>
      {budget ? <p className="mb-2 text-sm"><span className="text-muted-foreground">{labels.budget}: </span><span className="font-medium">{budget}</span></p> : null}
      {request.description ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{request.description}</p> : null}
      {request.referenceImages && request.referenceImages.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {request.referenceImages.map((img, i) => (
            <button key={`ref-${String(i)}`} type="button" onClick={() => setLightboxSrc(img)} aria-label="이미지 확대"
              className="group relative h-20 w-20 overflow-hidden rounded-lg border transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Image src={img} alt="" fill className="object-cover" unoptimized />
              <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50">
                <ZoomIn className="h-3 w-3 text-white" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {lightboxSrc ? <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} /> : null}
    </div>
  );
}

function BidCard({ bid, labels, isOwner, requestId, requestStatus, onChat }: Readonly<{
  bid: QuoteRequestDetail["bids"][number];
  labels: Record<string, string>;
  isOwner: boolean;
  requestId: string;
  requestStatus: string;
  onChat: (artistUserId: string, artistName: string) => void;
}>): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const isAccepted = bid.status === "ACCEPTED";

  function handleAccept(): void {
    startTransition(async () => {
      const result = await acceptBid(bid.id, requestId);
      if (result.success) {
        onChat(bid.artistUserId, bid.artistName);
      }
    });
  }

  return (
    <div className={`rounded-xl border p-4 ${isAccepted ? "border-emerald-500 bg-emerald-50" : "border-border"}`}>
      <BidCardHeader bid={bid} labels={labels} />
      {bid.description ? <p className="mb-3 whitespace-pre-wrap text-sm text-muted-foreground">{bid.description}</p> : null}
      {isAccepted ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" aria-hidden="true" />
            {labels.selectedArtist}
          </div>
          {isOwner ? (
            <button type="button" onClick={() => onChat(bid.artistUserId, bid.artistName)}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {labels.chatWithArtist}
            </button>
          ) : null}
        </div>
      ) : null}
      {isOwner && requestStatus === "OPEN" && !isAccepted ? (
        <button type="button" onClick={handleAccept} disabled={isPending}
          className="mt-2 w-full rounded-lg border border-brand-primary py-2 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          {isPending ? "..." : labels.selectArtist}
        </button>
      ) : null}
    </div>
  );
}

function BidCardHeader({ bid, labels }: Readonly<{
  bid: QuoteRequestDetail["bids"][number];
  labels: Record<string, string>;
}>): React.ReactElement {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        {bid.artistProfileImage ? (
          <Image src={bid.artistProfileImage} alt="" width={40} height={40} className="rounded-full object-cover" unoptimized />
        ) : (
          <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{bid.artistName}</p>
        {bid.estimatedDuration ? <p className="text-xs text-muted-foreground">{labels.estimatedDuration}: {bid.estimatedDuration}</p> : null}
      </div>
      <p className="text-lg font-bold text-brand-primary">{bid.price.toLocaleString()}{labels.budgetUnit}</p>
    </div>
  );
}

const BID_INPUT = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const QUOTE_REQUEST_PATH = "/quote-request";

function getErrorMessage(error: string | undefined, labels: Record<string, string>): string {
  const errorMap = new Map([["ALREADY_BID", labels.alreadyBid], ["ARTIST_ONLY", labels.artistOnly], ["LOGIN_REQUIRED", labels.loginRequired]]);
  return errorMap.get(error ?? "") ?? error ?? "Error";
}

function BidFormInputs({ price, setPrice, duration, setDuration, description, setDescription, labels }: Readonly<{
  price: string; setPrice: (v: string) => void;
  duration: string; setDuration: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  labels: Record<string, string>;
}>): React.ReactElement {
  return (
    <>
      <div>
        <label htmlFor="bid-price" className="mb-1 block text-xs font-medium">{labels.price} ({labels.budgetUnit})</label>
        <input id="bid-price" type="number" required value={price} onChange={(e) => setPrice(e.target.value)} className={BID_INPUT} />
      </div>
      <div>
        <label htmlFor="bid-duration" className="mb-1 block text-xs font-medium">{labels.estimatedDuration}</label>
        <input id="bid-duration" type="text" value={duration} onChange={(e) => setDuration(e.target.value)} className={BID_INPUT} placeholder="2시간, 3회 시술..." />
      </div>
      <div>
        <label htmlFor="bid-desc" className="mb-1 block text-xs font-medium">{labels.bidDescription}</label>
        <textarea id="bid-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={BID_INPUT} placeholder={labels.bidDescriptionPlaceholder} />
      </div>
    </>
  );
}

function BidForm({ labels, quoteRequestId }: Readonly<{
  labels: Record<string, string>;
  quoteRequestId: string;
}>): React.ReactElement {
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!price) return;
    startTransition(async () => {
      const result = await submitQuoteBid({
        quoteRequestId, price: Number(price),
        description: description.trim() || undefined,
        estimatedDuration: duration.trim() || undefined,
      });
      setMessage(result.success ? labels.bidSuccess : getErrorMessage(result.error, labels));
      if (result.success) { setPrice(""); setDescription(""); setDuration(""); }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border p-4">
      <h3 className="mb-4 text-sm font-bold">{labels.submitBid}</h3>
      <div className="flex flex-col gap-3">
        <BidFormInputs price={price} setPrice={setPrice} duration={duration} setDuration={setDuration} description={description} setDescription={setDescription} labels={labels} />
        {message ? <p className="text-sm text-brand-primary">{message}</p> : null}
        <button type="submit" disabled={isPending || !price}
          className="w-full rounded-lg bg-brand-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          {isPending ? "..." : labels.submitBid}
        </button>
      </div>
    </form>
  );
}

function OwnerActions({ requestId, labels, status }: Readonly<{
  requestId: string;
    labels: Record<string, string>;
  status: string;
}>): React.ReactElement | null {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (status !== "OPEN") return null;

  function handleDelete(): void {
    if (!globalThis.confirm(labels.deleteConfirm)) return;
    startTransition(async () => {
      const result = await cancelQuoteRequest(requestId);
      if (result.success) {
        router.push(QUOTE_REQUEST_PATH);
      }
    });
  }

  return (
    <div className="mb-4 flex gap-2">
      <button type="button" onClick={() => router.push(`${QUOTE_REQUEST_PATH}/${requestId}/edit`)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Pencil className="h-4 w-4" aria-hidden="true" />
        {labels.edit}
      </button>
      <button type="button" onClick={handleDelete} disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {isPending ? "..." : labels.delete}
      </button>
    </div>
  );
}

function CancelledBanner({ status }: Readonly<{ status: string }>): React.ReactElement | null {
  if (status !== "CANCELLED") return null;
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      이 견적 요청은 취소되었습니다.
    </div>
  );
}

export function QuoteRequestDetailClient({ request, labels, isOwner, isArtist, artistId, currentUserId }: Readonly<Props>): React.ReactElement {
  const router = useRouter();
  const [chatTarget, setChatTarget] = useState<{ userId: string; name: string } | null>(null);
  const alreadyBid = artistId ? request.bids.some((b) => b.artistId === artistId) : false;
  const canBid = isArtist && !isOwner && request.status === "OPEN" && !alreadyBid;

  function openChat(artistUserId: string, artistName: string): void {
    setChatTarget({ userId: artistUserId, name: artistName });
  }

  return (
    <div>
      <button type="button" onClick={() => router.push(QUOTE_REQUEST_PATH)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Go back to list">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {labels.listTitle}
      </button>
      <CancelledBanner status={request.status} />
      {isOwner ? <OwnerActions requestId={request.id} labels={labels} status={request.status} /> : null}
      <RequestInfo request={request} labels={labels} />
      <h3 className="mb-3 text-sm font-bold">{labels.bidCount.replace("{count}", String(request.bids.length))}</h3>
      {request.bids.length === 0 ? (
        <p className="mb-6 text-center text-sm text-muted-foreground">{labels.noBids}</p>
      ) : (
        <div className="mb-6 flex flex-col gap-3">
          {request.bids.map((b) => (
            <BidCard key={b.id} bid={b} labels={labels} isOwner={isOwner} requestId={request.id} requestStatus={request.status} onChat={openChat} />
          ))}
        </div>
      )}
      {canBid ? <BidForm labels={labels} quoteRequestId={request.id} /> : null}
      {chatTarget && currentUserId ? (
        <InlineChat
          otherUserId={chatTarget.userId}
          otherName={chatTarget.name}
          currentUserId={currentUserId}
          isOpen
          onClose={() => setChatTarget(null)}
        />
      ) : null}
    </div>
  );
}
