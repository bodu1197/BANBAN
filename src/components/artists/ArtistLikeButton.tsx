// @client-reason: Like toggle requires user interaction + server action
"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleLike } from "@/lib/actions/likes";
import { useViewerState } from "@/hooks/useViewerState";

interface ArtistLikeButtonProps {
  artistId: string;
  initialCount: number;
  label: string;
}

export function ArtistLikeButton({
  artistId,
  initialCount,
  label,
}: Readonly<ArtistLikeButtonProps>): React.ReactElement {
  // 서버는 "좋아요 안 함" 을 렌더한다 — 서버에서 로그인 상태를 읽으면 샵 상세 85개가 캐시 불가가 된다.
  // 마운트 후 실제 상태로 교체(로그인 사용자에게 하트가 잠깐 비어 보이는 건 의도된 트레이드오프).
  const viewer = useViewerState();
  // 서버 상태를 로컬 state 로 복사하지 않고 파생시킨다 — 복사하면 effect 안 setState 라 렌더가 한 번 더 돌고,
  // 하트를 누른 직후 서버 응답이 도착하면 낙관적 표시가 되돌아간다. 낙관적 토글은 override 로만 덮는다.
  const [likeOverride, setLikeOverride] = useState<boolean | null>(null);
  const isLiked = likeOverride ?? viewer.likedArtistIds.includes(artistId);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();

  const handleClick = (): void => {
    // 서버 응답 전에는 "좋아요 안 함"으로 그려져 있다. 이미 좋아요한 사용자가 이때 누르면
    // 화면은 +1 인데 서버는 좋아요를 해제해 상태가 영구히 어긋난다 — 확정될 때까지 막는다.
    if (!viewer.loaded) return;
    const next = !isLiked;
    setLikeOverride(next);
    setCount((prev) => prev + (next ? 1 : -1));

    startTransition(async () => {
      const result = await toggleLike(artistId).catch(() => null);
      if (!result?.success) {
        setLikeOverride(!next);
        setCount((prev) => prev + (next ? -1 : 1));
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!viewer.loaded}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full p-2 transition-colors hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50 disabled:hover:text-current"
      // 로딩 중에는 aria-pressed 가 아직 false 라 스크린리더가 틀린 상태를 읽는다 — 라벨로 확인 중임을 알린다.
      aria-label={viewer.loaded ? label : "좋아요 상태 확인 중"}
      aria-pressed={isLiked}
    >
      <Heart
        className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
      />
      <span className={`text-xs font-medium ${isLiked ? "text-red-500" : "text-muted-foreground"}`}>{count}</span>
    </button>
  );
}
