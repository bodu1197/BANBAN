// @client-reason: client-side interactions (like, share, navigation)
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Share2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PortfolioHeaderLabels {
  goBack: string;
  share: string;
  report: string;
  like: string;
  unlike: string;
  linkCopied: string;
  reportComingSoon: string;
}

const DEFAULT_LABELS: PortfolioHeaderLabels = {
  goBack: "Go back",
  share: "Share",
  report: "Report",
  like: "Like",
  unlike: "Unlike",
  linkCopied: "Link copied",
  reportComingSoon: "Report feature coming soon",
};

function resolveLikeAriaLabel(disabled: boolean, isLiked: boolean, likeLabel: string, unlikeLabel: string): string {
  if (disabled) return "좋아요 상태 확인 중";
  return isLiked ? unlikeLabel : likeLabel;
}

interface PortfolioHeaderProps {
  isLiked: boolean;
  /** 좋아요 상태 확정 전에는 누를 수 없다 — 확정 전 토글은 화면(+1)과 서버(해제)가 어긋난다. */
  likeDisabled?: boolean;
  onLikeToggle: () => void;
  onReport?: () => void;
  labels?: Partial<PortfolioHeaderLabels>;
}

 
export function PortfolioHeader({
  isLiked,
  likeDisabled = false,
  onLikeToggle,
  onReport,
  labels,
}: Readonly<PortfolioHeaderProps>): React.ReactElement {
  const router = useRouter();
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);
  // 로딩 중에는 aria-pressed 가 아직 false 라 스크린리더가 틀린 상태를 읽는다 — 라벨로 알린다.
  const likeAriaLabel = resolveLikeAriaLabel(likeDisabled, isLiked, l.like, l.unlike);

  const handleShare = (): void => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(globalThis.location.href);
      toast.success(l.linkCopied);
    }
  };

  const handleReport = (): void => {
    if (onReport) {
      onReport();
    } else {
      toast.info(l.reportComingSoon);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background px-2 py-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        aria-label={l.goBack}
        className="focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <div className="flex">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleShare}
          aria-label={l.share}
          className="focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Share2 className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReport}
          aria-label={l.report}
          className="focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Flag className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onLikeToggle}
          disabled={likeDisabled}
          aria-label={likeAriaLabel}
          aria-pressed={isLiked}
          className="focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <Heart className={cn("h-5 w-5", isLiked && "fill-red-500 text-red-500")} />
        </Button>
      </div>
    </header>
  );
}
