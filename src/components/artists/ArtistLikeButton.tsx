// @client-reason: Like toggle requires user interaction + server action
"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleLike } from "@/lib/actions/likes";

interface ArtistLikeButtonProps {
  artistId: string;
  initialIsLiked: boolean;
  initialCount: number;
  label: string;
}

export function ArtistLikeButton({
  artistId,
  initialIsLiked,
  initialCount,
  label,
}: Readonly<ArtistLikeButtonProps>): React.ReactElement {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();

  const handleClick = (): void => {
    const next = !isLiked;
    setIsLiked(next);
    setCount((prev) => prev + (next ? 1 : -1));

    startTransition(async () => {
      const result = await toggleLike(artistId).catch(() => null);
      if (!result?.success) {
        setIsLiked((prev) => !prev);
        setCount((prev) => prev + (next ? -1 : 1));
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex shrink-0 items-center gap-1 rounded-full p-1 transition-colors hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={label}
      aria-pressed={isLiked}
    >
      <Heart
        className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
      />
      <span className={`text-xs font-medium ${isLiked ? "text-red-500" : "text-muted-foreground"}`}>{count}</span>
    </button>
  );
}
