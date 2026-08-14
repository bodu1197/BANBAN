// @client-reason: 좋아요 낙관적 토글 — 서버 상태 파생 + 클릭 시 즉시 반영
"use client";

import { useCallback, useMemo, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { toggleLike } from "@/lib/actions/likes";
import { useViewerState, addViewerResetListener } from "@/hooks/useViewerState";

export interface LikedArtistsState {
  /** 현재 좋아요한 샵 ID — 서버 상태에 낙관적 토글을 덮어쓴 결과. */
  likedIds: ReadonlySet<string>;
  /** 아직 서버 응답 전이면 false — 이때 토글 UI 는 눌리지 않아야 한다. */
  loaded: boolean;
  /** 토글. 서버가 거부하면(예: 비로그인) false 로 resolve 하므로 호출부가 자기 상태를 되돌릴 수 있다. */
  toggleArtistLike: (artistId: string) => Promise<boolean>;
}

/**
 * 낙관적 토글 결과를 **모듈 스코프**에 둔다.
 *
 * 컴포넌트별 state 로 두면 목록에서 좋아요한 뒤 상세로 넘어갔을 때 그 하트가 "안 함"으로 그려지고
 * 다음 클릭이 좋아요를 해제해버린다(useViewerState 의 서버 응답은 모듈 캐시라 갱신되지 않기 때문).
 * 한 곳에 모아두면 페이지를 옮겨도 방금 누른 결과가 유지된다.
 */
let overrides: ReadonlyMap<string, boolean> = new Map();
const listeners = new Set<() => void>();
/** 서버 응답을 기다리는 중인 샵 — 같은 대상의 중복 토글을 막는다. */
const pending = new Set<string>();

function setOverride(artistId: string, liked: boolean | null): void {
  const next = new Map(overrides);
  if (liked === null) next.delete(artistId);
  else next.set(artistId, liked);
  overrides = next;
  for (const listener of listeners) listener();
}

function subscribeOverrides(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

const getOverrides = (): ReadonlyMap<string, boolean> => overrides;
const EMPTY: ReadonlyMap<string, boolean> = new Map();
const getServerOverrides = (): ReadonlyMap<string, boolean> => EMPTY;

// 로그아웃·계정 전환 시 이전 사용자가 누른 하트가 남으면 다음 사용자 화면에 그대로 그려진다.
// 컴포넌트 effect 가 아니라 모듈 로드 시점에 등록한다 — 로그아웃 순간 이 훅을 쓰는 컴포넌트가
// 하나도 안 떠 있을 수 있고, 그러면 초기화 기회를 영영 놓친다.
addViewerResetListener(() => {
  overrides = EMPTY;
  pending.clear();
  for (const listener of listeners) listener();
});

/**
 * 샵 좋아요 상태 한 곳.
 *
 * 서버는 로그아웃 상태를 렌더한다(그래야 이 페이지가 캐시를 받는다) — 실제 상태는 마운트 후 채워진다.
 * 서버 상태를 로컬 state 로 **복사하지 않고 파생**시킨다: 복사하면 effect 안 setState 라 렌더가 한 번 더 돌고,
 * 하트를 누른 직후 서버 응답이 도착하면 낙관적 표시가 되돌아간다. 낙관적 토글은 override 로만 덮는다.
 *
 * ⚠️ `loaded` 가 false 인 동안 토글을 허용하면 안 된다 — 화면은 "좋아요 안 함"인데 서버는 이미 좋아요라,
 * 누르는 순간 화면은 +1 이고 서버는 해제해 상태가 영구히 어긋난다.
 */
export function useLikedArtists(): LikedArtistsState {
  const viewer = useViewerState();
  const current = useSyncExternalStore(subscribeOverrides, getOverrides, getServerOverrides);
  const [, startTransition] = useTransition();

  const likedIds = useMemo(() => {
    const ids = new Set(viewer.likedArtistIds);
    for (const [id, liked] of current) {
      if (liked) ids.add(id);
      else ids.delete(id);
    }
    return ids;
  }, [viewer.likedArtistIds, current]);

  const toggleArtistLike = useCallback(async (artistId: string): Promise<boolean> => {
    // 응답 전에 또 누르면 서버액션이 2번 나가 마지막 결과가 화면과 반대가 된다(빠른 더블클릭).
    if (!viewer.loaded || pending.has(artistId)) return false;

    const next = !(overrides.get(artistId) ?? viewer.likedArtistIds.includes(artistId));
    pending.add(artistId);
    setOverride(artistId, next);

    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await toggleLike(artistId).catch(() => null);
        pending.delete(artistId);
        if (!result?.success) {
          // 내가 쓴 값이 아직 그대로일 때만 되돌린다. 그 사이 더 최신 토글이 성공해 있으면
          // 무조건 지우는 롤백이 그 결과까지 날려 화면이 서버와 반대로 남는다.
          if (overrides.get(artistId) === next) setOverride(artistId, null);
          // 조용히 되돌리면 "눌렀는데 왜 풀리지"만 남는다 — 대부분 비로그인이다.
          toast.error(result?.error === "unauthorized" ? "로그인이 필요합니다" : "잠시 후 다시 시도해주세요");
        }
        resolve(result?.success === true);
      });
    });
  }, [viewer.loaded, viewer.likedArtistIds]);

  return { likedIds, loaded: viewer.loaded, toggleArtistLike };
}
