// @client-reason: client-side interactions (like)
"use client";

import { STRINGS } from "@/lib/strings";
import { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import Link from "next/link";
import { Heart, Edit2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ContactBottomBar } from "@/components/shared/ContactBottomBar";
import { PortfolioMediaViewer } from "./PortfolioMediaViewer";
import { PortfolioHeader } from "./PortfolioHeader";
import { PortfolioInfoSection } from "./PortfolioInfoSection";
import { PORTFOLIO_SECTION_IDS } from "./portfolio-section-ids";
import { extractYouTubeId } from "@/components/portfolio-form/media-upload";
import type { PortfolioDetails } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";
import { getStorageUrl } from "@/lib/supabase/storage-utils";
import { useAuth } from "@/hooks/useAuth";
import { togglePortfolioLike } from "@/lib/actions/portfolio-likes";
import { reportContent } from "@/lib/actions/report";

function useCanEdit(userId: string | undefined, myArtistId: string | undefined, portfolioArtistId: string): boolean {
  const isOwner = myArtistId === portfolioArtistId;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!userId || isOwner) return;
    let cancelled = false;
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.from("profiles").select("is_admin").eq("id", userId).single()
        .then(({ data }) => {
          if (!cancelled) setIsAdmin((data as { is_admin: boolean } | null)?.is_admin === true);
        });
    });
    return (): void => { cancelled = true; };
  }, [userId, isOwner]);

  return !!userId && (isOwner || isAdmin);
}

interface PortfolioDetailClientProps {
  portfolio: PortfolioDetails;
  firstImageUrl?: string | null;
  heroMedia?: React.ReactNode;
  heroBanner?: React.ReactNode;
  descriptionHtml: string;
  artistSection?: React.ReactNode;
}

async function handleToggleLike(
  portfolioId: string,
  setIsLiked: React.Dispatch<React.SetStateAction<boolean>>,
  setLikesCount: React.Dispatch<React.SetStateAction<number>>,
  likeAddedMsg: string,
  likeRemovedMsg: string,
): Promise<void> {
  // Optimistic UI update
  setIsLiked((prev) => {
    const newValue = !prev;
    setLikesCount((c) => (newValue ? c + 1 : c - 1));
    toast.success(newValue ? likeAddedMsg : likeRemovedMsg);
    return newValue;
  });

  // 서버 액션 호출
  const result = await togglePortfolioLike(portfolioId);
  if (!result.success) {
    // 실패 시 롤백
    setIsLiked((prev) => !prev);
    setLikesCount((c) => (result.isLiked ? c + 1 : c - 1));
  }
}

function YouTubeEmbed({ url }: Readonly<{ url: string | null }>): React.ReactElement | null {
  if (!url) return null;
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  return (
    <section className="px-4 py-4">
      <div className="aspect-video w-full overflow-hidden rounded-xl">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube 영상"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    </section>
  );
}

const REPORT_REASONS = [
  { value: "SPAM", label: "스팸/광고" },
  { value: "ABUSE", label: "욕설/비방" },
  { value: "ADULT", label: "음란/선정성" },
  { value: "HATE", label: "혐오/차별" },
  { value: "OTHER", label: "기타" },
] as const;

// eslint-disable-next-line max-lines-per-function
export function PortfolioDetailClient({
  portfolio,
  firstImageUrl,
  heroMedia,
  heroBanner,
  descriptionHtml,
  artistSection,
}: Readonly<PortfolioDetailClientProps>): React.ReactElement {
  const [isLiked, setIsLiked] = useState(Boolean(portfolio.is_liked));
  const [likesCount, setLikesCount] = useState(portfolio.likes_count ?? 0);
  const [showReportModal, setShowReportModal] = useState(false);
  const { user, artist: myArtist } = useAuth();
  const canEdit = useCanEdit(user?.id, myArtist?.id, portfolio.artist_id);

  const artist = portfolio.artist;
  const address = artist.region?.name ?? artist.address ?? "";

  const handleLikeToggle = useCallback(
    () => handleToggleLike(portfolio.id, setIsLiked, setLikesCount, STRINGS.common.likeAdded, STRINGS.common.likeRemoved),
    [portfolio.id],
  );

  const mediaItems = useMemo(
    () => (portfolio.portfolio_media ?? []).map((m) => ({ type: "image" as const, url: getStorageUrl(m.storage_path) ?? m.storage_path })),
    [portfolio.portfolio_media],
  );

  const headerLabels = useMemo(() => ({
    goBack: STRINGS.common.goBack,
    share: STRINGS.common.share,
    report: STRINGS.common.report,
    like: STRINGS.common.like,
    unlike: STRINGS.common.unlike,
    linkCopied: STRINGS.common.linkCopied,
    reportComingSoon: STRINGS.common.reportComingSoon,
  }), []);

  const handleReport = useCallback(() => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    setShowReportModal(true);
  }, [user]);

  return (
    <div className="flex flex-col pb-24">
      <PortfolioHeader
        isLiked={isLiked}
        onLikeToggle={handleLikeToggle}
        onReport={handleReport}
        labels={headerLabels}
      />

      {heroBanner}

      <section
        id={PORTFOLIO_SECTION_IDS.description}
        aria-label="시술 사진 및 설명"
        className="relative bg-black"
      >
        {heroMedia}
        <PortfolioMediaViewer
          media={mediaItems}
          altTitle={portfolio.title}
          firstImageUrl={firstImageUrl ?? undefined}
        />
      </section>

      <PortfolioInfoSection
        address={address}
        descriptionHtml={descriptionHtml}
      />

      <YouTubeEmbed url={portfolio.youtube_url} />

      <section id={PORTFOLIO_SECTION_IDS.reviews} aria-label="후기 및 좋아요">
        <PortfolioActionButtons
          isLiked={isLiked}
          likesCount={likesCount}
          onLikeToggle={handleLikeToggle}
          reviewHref={`/reviews/write?id=${artist.id}`}
          editHref={canEdit ? `/mypage/artist/portfolios/edit/${portfolio.id}` : null}
          likesLabel={STRINGS.artist.likes}
          reviewLabel={STRINGS.portfolio.writeReview}
        />
      </section>

      {artistSection}

      <ContactBottomBar
        kakaoUrl={artist.kakao_url}
        contact={artist.contact}
        artistId={portfolio.artist_id}
        sourceType="portfolio"
        sourceId={portfolio.id}
        onShopInfoClick={scrollToShopSection}
      />

      {showReportModal ? (
        <PortfolioReportModal
          portfolioId={portfolio.id}
          onClose={() => setShowReportModal(false)}
        />
      ) : null}
    </div>
  );
}

function PortfolioActionButtons({ isLiked, likesCount, onLikeToggle, reviewHref, editHref, likesLabel, reviewLabel }: Readonly<{
  isLiked: boolean;
  likesCount: number;
  onLikeToggle: () => void;
  reviewHref: string;
  editHref: string | null;
  likesLabel: string;
  reviewLabel: string;
}>): React.ReactElement {
  return (
    <div className="flex gap-3 px-4 py-4">
      <Button variant="outline" className="flex-1 gap-2 focus-visible:ring-2 focus-visible:ring-ring" onClick={onLikeToggle}>
        <Heart className={cn("h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
        {likesLabel} {likesCount > 0 && likesCount}
      </Button>
      <Button variant="outline" className="flex-1 gap-2 focus-visible:ring-2 focus-visible:ring-ring" asChild>
        <Link href={reviewHref}><Edit2 className="h-4 w-4" />{reviewLabel}</Link>
      </Button>
      {editHref && (
        <Button variant="outline" className="gap-2 focus-visible:ring-2 focus-visible:ring-ring" asChild>
          <Link href={editHref}><Pencil className="h-4 w-4" />수정</Link>
        </Button>
      )}
    </div>
  );
}

function scrollToShopSection(): void {
  const el = document.getElementById(PORTFOLIO_SECTION_IDS.artist);
  if (!el) return;
  const reduced = typeof globalThis.matchMedia === "function"
    && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}


function ReportReasonFieldset({ reason, onChange }: Readonly<{
  reason: string; onChange: (v: string) => void;
}>): React.ReactElement {
  return (
    <fieldset className="mb-4 space-y-2">
      <legend className="sr-only">신고 사유</legend>
      {REPORT_REASONS.map((r) => (
        <label
          key={r.value}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary/5"
        >
          <input type="radio" name="report-reason" value={r.value} checked={reason === r.value} onChange={() => onChange(r.value)} className="accent-brand-primary" />
          <span>{r.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

function ReportModalActions({ isPending, onClose, onSubmit }: Readonly<{
  isPending: boolean; onClose: () => void; onSubmit: () => void;
}>): React.ReactElement {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>{STRINGS.common.cancel}</Button>
      <Button size="sm" onClick={onSubmit} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">신고하기</Button>
    </div>
  );
}

function PortfolioReportModal({ portfolioId, onClose }: Readonly<{
  portfolioId: string; onClose: () => void;
}>): React.ReactElement {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].value);
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const panelRef = useCallback((node: HTMLDivElement | null) => {
    if (node) node.focus();
  }, []);

  function handleSubmit(): void {
    startTransition(async () => {
      const result = await reportContent("portfolio", portfolioId, reason, description);
      if (result.alreadyReported) { toast.info("이미 신고한 포트폴리오입니다"); onClose(); return; }
      if (!result.success) { toast.error("신고 처리에 실패했습니다"); return; }
      toast.success("신고가 접수되었습니다");
      onClose();
    });
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="portfolio-report-title" className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4" onKeyDown={handleKeyDown}>
      <button type="button" aria-label={STRINGS.common.close} onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div ref={panelRef} tabIndex={-1} className="relative w-full max-w-md rounded-t-2xl bg-background p-5 shadow-xl outline-none md:rounded-2xl">
        <h2 id="portfolio-report-title" className="mb-1 text-base font-bold">포트폴리오 신고</h2>
        <p className="mb-4 text-xs text-muted-foreground">신고 사유를 선택해주세요. 허위 신고 시 제재될 수 있습니다.</p>
        <ReportReasonFieldset reason={reason} onChange={setReason} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="추가 설명 (선택)" aria-label="추가 설명" rows={3} maxLength={500} className="mb-4 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <ReportModalActions isPending={isPending} onClose={onClose} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
