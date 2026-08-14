// @client-reason: Like toggle requires user interaction + server action
"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useLikedArtists } from "@/hooks/useLikedArtists";

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
  // 좋아요 상태·낙관적 토글·확정 전 클릭 차단은 목록과 같은 훅을 쓴다(로직 중복 제거).
  // 서버는 "좋아요 안 함"을 렌더하고 마운트 후 실제 상태로 바뀐다 — 그래야 샵 상세 85개가 캐시된다.
  const { likedIds, loaded, toggleArtistLike } = useLikedArtists();
  const isLiked = likedIds.has(artistId);

  // 개수만 이 버튼의 로컬 상태다 — 목록 카드는 개수를 안 보여줘 훅이 다루지 않는다.
  const [countDelta, setCountDelta] = useState(0);
  const count = initialCount + countDelta;

  const handleClick = (): void => {
    if (!loaded) return;
    const delta = isLiked ? -1 : 1;
    setCountDelta((prev) => prev + delta);
    // 서버가 거부하면(비로그인 등) 훅은 하트를 되돌리는데 개수는 이 컴포넌트 것이라
    // 같이 되돌리지 않으면 하트만 원복되고 숫자가 영구히 어긋난다.
    void toggleArtistLike(artistId).then((ok) => {
      if (!ok) setCountDelta((prev) => prev - delta);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!loaded}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full p-2 transition-colors hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50 disabled:hover:text-current"
      // aria-label 은 버튼의 이름을 통째로 덮으므로 개수를 빼면 스크린리더는 숫자를 영영 못 듣는다.
      // 로딩 중에는 aria-pressed 가 아직 false 라 상태가 거짓말이 된다 — 라벨로 확인 중임을 알린다.
      aria-label={loaded ? `${label} ${String(count)}` : "좋아요 상태 확인 중"}
      aria-pressed={isLiked}
    >
      <Heart
        className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
      />
      <span className={`text-xs font-medium ${isLiked ? "text-red-500" : "text-muted-foreground"}`}>{count}</span>
    </button>
  );
}
