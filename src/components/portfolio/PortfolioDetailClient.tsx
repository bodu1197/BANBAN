// @client-reason: client-side interactions (like)
"use client";

import { STRINGS } from "@/lib/strings";
import { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Heart, Edit2, Pencil, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PortfolioMediaViewer } from "./PortfolioMediaViewer";
import { PortfolioHeader } from "./PortfolioHeader";
import { PortfolioInfoSection } from "./PortfolioInfoSection";
import { extractYouTubeId } from "@/components/portfolio-form/media-upload";
const PortfolioArtistSection = dynamic(() => import("./PortfolioArtistSection").then(m => m.PortfolioArtistSection));
const PortfolioRecommendations = dynamic(() => import("./PortfolioRecommendations").then(m => m.PortfolioRecommendations));
import type { PortfolioDetails, PortfolioWithMedia, PortfolioRecommendation } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";
import { getAvatarUrl, getStorageUrl } from "@/lib/supabase/storage-utils";
import { useAuth } from "@/hooks/useAuth";
import { togglePortfolioLike } from "@/lib/actions/portfolio-likes";
import { reportContent } from "@/lib/actions/report";
import { useRouter } from "next/navigation";
// 1:1 채팅 — 당분간 비활성화
// import dynamic from "next/dynamic";
// const InlineChat = dynamic(
//   () => import("@/components/chat/InlineChat").then((m) => ({ default: m.InlineChat })),
//   { ssr: false }
// );

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
  artistPortfolios: PortfolioWithMedia[];
  artistPortfolioCount: number;
    firstImageUrl?: string | null;
  heroMedia?: React.ReactNode;
  /** Server pre-sanitized description HTML — sanitize-html을 client 번들에서 제외하기 위함. */
  descriptionHtml: string;
  recommendations: {
    otherCustomersViewed: PortfolioRecommendation[];
    lowerPrice: PortfolioRecommendation[];
    higherPrice: PortfolioRecommendation[];
    sameBodyPart: PortfolioRecommendation[];
    styleSuggestions: PortfolioRecommendation[];
  };
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

// eslint-disable-next-line max-lines-per-function, complexity
export function PortfolioDetailClient({
  portfolio,
  artistPortfolios,
  artistPortfolioCount,

  firstImageUrl,
  heroMedia,
  descriptionHtml,
  recommendations,
}: Readonly<PortfolioDetailClientProps>): React.ReactElement {
  const [isLiked, setIsLiked] = useState(Boolean(portfolio.is_liked));
  const [likesCount, setLikesCount] = useState(portfolio.likes_count ?? 0);
  const [showReportModal, setShowReportModal] = useState(false);
  const { user, artist: myArtist } = useAuth();
  const canEdit = useCanEdit(user?.id, myArtist?.id, portfolio.artist_id);

  const artist = portfolio.artist;
  const address = artist.region?.name ?? artist.address ?? "";
  const artistHref = `/artists/${artist.id}`;
  const artistAvatar = getAvatarUrl(artist.profile_image_path ?? null);

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

  const recommendLabels = useMemo(() => ({
    recommend: STRINGS.portfolio.recommend,
    othersViewed: STRINGS.portfolio.othersViewed,
    lowerPriceTitle: STRINGS.portfolio.lowerPrice,
    higherPriceTitle: STRINGS.portfolio.higherPrice,
    samePart: STRINGS.portfolio.samePart,
    recommended: STRINGS.portfolio.recommended,
    currencyUnit: STRINGS.common.currencyUnit,
  }), []);

  const totalCountLabel = STRINGS.artist.totalCount.replace("{count}", String(artistPortfolioCount));

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
        title={portfolio.title}
        isLiked={isLiked}
        onLikeToggle={handleLikeToggle}
        onReport={handleReport}
        labels={headerLabels}
      />

      <section className="relative bg-black">
        {heroMedia}
        <PortfolioMediaViewer
          media={mediaItems}
          altTitle={portfolio.title}
          firstImageUrl={firstImageUrl ?? undefined}
        />
      </section>

      <PortfolioInfoSection
        title={portfolio.title}
        address={address}
        price={portfolio.price}
        priceOrigin={portfolio.price_origin}
        discountRate={portfolio.discount_rate}
        descriptionHtml={descriptionHtml}
        currencyUnit={STRINGS.common.currencyUnit}
        discountEventLabel={STRINGS.portfolio.discountEvent}
      />

      <YouTubeEmbed url={portfolio.youtube_url} />

      <PortfolioActionButtons
        isLiked={isLiked}
        likesCount={likesCount}
        onLikeToggle={handleLikeToggle}
        reviewHref={`/reviews/write?id=${artist.id}`}
        editHref={canEdit ? `/mypage/artist/portfolios/edit/${portfolio.id}` : null}
        likesLabel={STRINGS.artist.likes}
        reviewLabel={STRINGS.portfolio.writeReview}
      />

      <PortfolioArtistSection
        artistName={artist.title}
        artistAvatar={artistAvatar}
        artistHref={artistHref}
        address={address}
        totalCountLabel={totalCountLabel}
        seeAllLabel={STRINGS.common.seeAll}
        sectionTitle={STRINGS.pages.artistsList}
        artistPortfolios={artistPortfolios}
        artistPortfolioCount={artistPortfolioCount}
      />

      <PortfolioRecommendations
        otherCustomersViewed={recommendations.otherCustomersViewed}
        lowerPrice={recommendations.lowerPrice}
        higherPrice={recommendations.higherPrice}
        sameBodyPart={recommendations.sameBodyPart}
        styleSuggestions={recommendations.styleSuggestions}
        labels={recommendLabels}
      />

      <PortfolioBottomBar
        kakaoUrl={artist.kakao_url}
        contact={artist.contact}
        artistUserId={artist.user_id}
        artistName={artist.title}
        currentUser={user}
        artistId={portfolio.artist_id}
        portfolioId={portfolio.id}
      />

      {showReportModal ? (
        <PortfolioReportModal
          portfolioId={portfolio.id}
          artistUserId={artist.user_id}
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

const BASE_BTN = "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const THEME_BTN = `${BASE_BTN} border-border bg-background text-foreground hover:bg-muted focus-visible:bg-muted`;
const KAKAO_BTN = `${BASE_BTN} border-transparent bg-brand-kakao text-brand-kakao-foreground hover:brightness-95 focus-visible:brightness-95`;

function trackContactClick(artistId: string, clickType: "kakao" | "phone", sourceId: string): void {
  void fetch("/api/contact-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artistId, clickType, sourcePage: "portfolio", sourceId }),
    keepalive: true,
  });
}

function BottomBarIcons({ kakaoUrl, contact, onChat: _onChat, artistId, portfolioId }: Readonly<{
  kakaoUrl?: string | null; contact?: string | null; onChat: () => void;
  artistId: string; portfolioId: string;
}>): React.ReactElement {
  return (
    <div className="flex flex-1 items-center gap-1.5">
      {/* 1:1 채팅 — 당분간 비활성화
      <button type="button" onClick={onChat} className={THEME_BTN} aria-label="1:1 채팅">
        <MessageCircle className="h-4 w-4" />
        채팅
      </button>
      */}
      {kakaoUrl ? (
        <a href={kakaoUrl} target="_blank" rel="noopener noreferrer" className={KAKAO_BTN} aria-label="카카오톡" onClick={() => trackContactClick(artistId, "kakao", portfolioId)}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.21 4.65 6.58-.15.55-.58 2.07-.66 2.39-.1.4.15.39.31.28.13-.08 2.02-1.37 2.84-1.93.9.13 1.83.2 2.79.2 5.52 0 10-3.58 10-7.52C22 6.58 17.52 3 12 3z" />
          </svg>
          카카오톡
        </a>
      ) : null}
      {contact ? (
        <a href={`tel:${contact}`} className={THEME_BTN} aria-label="전화" onClick={() => trackContactClick(artistId, "phone", portfolioId)}>
          <Phone className="h-4 w-4" />
          전화
        </a>
      ) : null}
    </div>
  );
}

function PortfolioBottomBar({ kakaoUrl, contact, artistUserId: _artistUserId, artistName: _artistName, currentUser, artistId, portfolioId }: Readonly<{
  kakaoUrl?: string | null; contact?: string | null;
  artistUserId: string; artistName: string;
  currentUser: { id: string } | null | undefined;
  artistId: string; portfolioId: string;
}>): React.ReactElement {
  // 1:1 채팅 — 당분간 비활성화
  const [_chatOpen, _setChatOpen] = useState(false);
  const router = useRouter();

  const handleChat = (): void => {
    if (currentUser) _setChatOpen(true);
    else router.push("/login");
  };

  return (
    <>
      <div className="fixed bottom-0 left-1/2 w-full max-w-[767px] -translate-x-1/2 border-t bg-background p-2">
        <div className="flex items-center gap-1.5">
          <BottomBarIcons kakaoUrl={kakaoUrl} contact={contact} onChat={handleChat} artistId={artistId} portfolioId={portfolioId} />
        </div>
      </div>
      {/* 1:1 채팅 — 당분간 비활성화
      {currentUser ? (
        <InlineChat
          otherUserId={artistUserId}
          otherName={artistName}
          currentUserId={currentUser.id}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      ) : null}
      */}
    </>
  );
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

function PortfolioReportModal({ portfolioId, artistUserId, onClose }: Readonly<{
  portfolioId: string; artistUserId: string; onClose: () => void;
}>): React.ReactElement {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].value);
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();

  function handleSubmit(): void {
    startTransition(async () => {
      const result = await reportContent("portfolio", portfolioId, reason, description);
      if (result.alreadyReported) { alert("이미 신고한 포트폴리오입니다"); onClose(); return; }
      if (!result.success) { alert("신고 처리에 실패했습니다"); return; }
      alert("신고가 접수되었습니다");
      onClose();
    });
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="portfolio-report-title" className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
      <button type="button" aria-label={STRINGS.common.close} onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-md rounded-t-2xl bg-background p-5 shadow-xl md:rounded-2xl">
        <h2 id="portfolio-report-title" className="mb-1 text-base font-bold">포트폴리오 신고</h2>
        <p className="mb-4 text-xs text-muted-foreground">신고 사유를 선택해주세요. 허위 신고 시 제재될 수 있습니다.</p>
        <ReportReasonFieldset reason={reason} onChange={setReason} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="추가 설명 (선택)" rows={3} maxLength={500} className="mb-4 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <ReportModalActions isPending={isPending} onClose={onClose} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
