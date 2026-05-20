// @client-reason: Back navigation using router + clipboard/share interaction
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Share2 } from "lucide-react";

interface ArtistTopBarProps {
  shopName: string;
  onShare?: () => void;
  backLabel: string;
  shareLabel: string;
}

export function ArtistTopBar({
  shopName,
  onShare,
  backLabel,
  shareLabel,
}: Readonly<ArtistTopBarProps>): React.ReactElement {
  const router = useRouter();

  const handleBack = (): void => {
    router.back();
  };

  const handleShare = async (): Promise<void> => {
    if (onShare) {
      onShare();
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: globalThis.location.href,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(globalThis.location.href);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-12 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <button
        type="button"
        onClick={handleBack}
        className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={backLabel}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <p aria-hidden className="min-w-0 flex-1 truncate text-base font-semibold">{shopName}</p>
      <button
        type="button"
        onClick={handleShare}
        className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={shareLabel}
      >
        <Share2 className="h-5 w-5" />
      </button>
    </header>
  );
}
