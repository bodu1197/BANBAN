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

interface PortfolioHeaderProps {
  title: string;
  isLiked: boolean;
  onLikeToggle: () => void;
  labels?: Partial<PortfolioHeaderLabels>;
}

// eslint-disable-next-line max-lines-per-function
export function PortfolioHeader({
  title,
  isLiked,
  onLikeToggle,
  labels,
}: Readonly<PortfolioHeaderProps>): React.ReactElement {
  const router = useRouter();
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);

  const handleShare = (): void => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(globalThis.location.href);
      toast.success(l.linkCopied);
    }
  };

  const handleReport = (): void => {
    toast.info(l.reportComingSoon);
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

      <h1 className="flex-1 truncate px-2 text-center font-semibold">
        {title}
      </h1>

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
          aria-label={isLiked ? l.unlike : l.like}
          aria-pressed={isLiked}
          className="focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Heart className={cn("h-5 w-5", isLiked && "fill-red-500 text-red-500")} />
        </Button>
      </div>
    </header>
  );
}
