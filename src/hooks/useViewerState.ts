// @client-reason: 마운트 후 개인화 상태(로그인·좋아요)를 채운다 — 서버 렌더에서 읽으면 페이지가 캐시 불가가 된다
"use client";

import { useSyncExternalStore } from "react";
import { fetchViewerState, type ViewerState } from "@/lib/actions/viewer";

const PENDING: ViewerState = { isLoggedIn: false, likedArtistIds: [], loaded: false };
/** 조회 실패 시에도 화면은 동작해야 한다 — 로그아웃 화면으로 확정하고 토글은 열어준다. */
const FAILED: ViewerState = { isLoggedIn: false, likedArtistIds: [], loaded: true };

/**
 * 뷰어 상태를 모듈 스코프에 한 벌만 둔다.
 *
 * 요청 dedupe: 샵 상세는 ShopBlogClient 와 ArtistLikeButton 이 각각 이 훅을 쓰는데, Next 의 서버
 * 액션 큐는 액션을 직렬로 처리하므로 dedupe 가 없으면 왕복이 2배가 되고 두 번째가 첫 번째를 기다린다.
 * (react-query Provider 는 일부 세그먼트에만 있어 provider 비의존 모듈 캐시를 쓴다.)
 */
let snapshot: ViewerState = PENDING;
let inFlight = false;
/** 성공 응답만 캐시한다 — 실패는 다음 마운트에서 다시 시도할 수 있어야 한다. */
let settled = false;
/** 인증이 바뀌면 증가한다 — 뒤늦게 도착한 옛 사용자의 응답을 버리는 기준. */
let generation = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function load(): void {
  if (inFlight || settled) return;
  inFlight = true;
  const gen = generation;
  void fetchViewerState()
    .then((next) => {
      if (gen !== generation) return;
      snapshot = next;
      settled = true;
      emit();
    })
    .catch(() => {
      if (gen !== generation) return;
      snapshot = FAILED;
      emit();
    })
    .finally(() => { inFlight = false; });
}

/**
 * 로그인·로그아웃 시 이전 사용자의 상태를 **버린다**.
 *
 * 헤더 로그아웃은 소프트 내비게이션이라 리로드가 없다. 이 초기화가 없으면 같은 탭에서 다음 사용자가
 * 이전 사용자의 좋아요 목록을 하트로 보고, 그 하트를 누르는 순간 서버가 반대 방향으로 토글된다.
 */
const resetListeners = new Set<() => void>();

export function addViewerResetListener(fn: () => void): void {
  resetListeners.add(fn);
}

function resetViewer(): void {
  generation += 1;
  inFlight = false;
  settled = false;
  snapshot = PENDING;
  for (const fn of resetListeners) fn();
  emit();
  load();
}

let authWatched = false;
/** undefined = 아직 기준선을 못 잡음(구독 직후의 첫 통지). */
let watchedUserId: string | null | undefined;

function watchAuthOnce(): void {
  if (authWatched) return;
  authWatched = true;
  // supabase-js 는 초기 번들에 넣지 않는다(HeaderUserSection 과 같은 지연 로드 규칙).
  void import("@/lib/supabase/client")
    .then(({ createClient }) => {
      createClient().auth.onAuthStateChange((_event, session) => {
        const nextId = session?.user?.id ?? null;
        // TOKEN_REFRESHED·탭 복귀에도 발화한다 — 사용자가 실제로 바뀔 때만 버린다.
        if (watchedUserId === undefined) { watchedUserId = nextId; return; }
        if (watchedUserId === nextId) return;
        watchedUserId = nextId;
        resetViewer();
      });
    })
    .catch(() => { authWatched = false; });
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  watchAuthOnce();
  load();
  return () => { listeners.delete(onChange); };
}

const getSnapshot = (): ViewerState => snapshot;
/** 서버·프리렌더는 항상 로그아웃 — 이게 크롤러가 보는 화면이자 캐시되는 화면이다. */
const getServerSnapshot = (): ViewerState => PENDING;

/**
 * 서버는 로그아웃 상태를 렌더하고(=크롤러가 보는 화면 = 캐시 가능한 화면),
 * 브라우저가 붙은 뒤 실제 사용자 상태로 교체한다.
 * 로그인 사용자에게는 하트가 잠깐 빈 채로 보였다가 채워진다 — 캐시를 살리기 위한 의도된 트레이드오프.
 */
export function useViewerState(): ViewerState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
