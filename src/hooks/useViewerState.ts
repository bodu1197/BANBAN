// @client-reason: 마운트 후 개인화 상태(로그인·좋아요)를 채운다 — 서버 렌더에서 읽으면 페이지가 캐시 불가가 된다
"use client";

import { useEffect, useState } from "react";
import { fetchViewerState, type ViewerState } from "@/lib/actions/viewer";

const PENDING: ViewerState = { isLoggedIn: false, likedArtistIds: [], loaded: false };
/** 조회 실패 시에도 화면은 동작해야 한다 — 로그아웃 화면으로 확정하고 토글은 열어준다. */
const FAILED: ViewerState = { isLoggedIn: false, likedArtistIds: [], loaded: true };

/**
 * 진행 중인 요청을 모듈 스코프에 붙들어 **한 페이지에서 한 번만** 부른다.
 * 샵 상세는 ShopBlogClient 와 ArtistLikeButton 이 각각 이 훅을 쓰는데, Next 의 서버 액션 큐는
 * 액션을 직렬로 처리하므로 dedupe 가 없으면 왕복이 2배가 되고 두 번째가 첫 번째를 기다린다.
 * (react-query Provider 는 일부 세그먼트에만 있어 provider 비의존 모듈 캐시를 쓴다.)
 */
let inFlight: Promise<ViewerState> | null = null;

function loadViewerState(): Promise<ViewerState> {
  inFlight ??= fetchViewerState().catch(() => {
    inFlight = null; // 실패는 캐시하지 않는다 — 다음 마운트에서 다시 시도할 수 있어야 한다.
    return FAILED;
  });
  return inFlight;
}

/**
 * 서버는 로그아웃 상태를 렌더하고(=크롤러가 보는 화면 = 캐시 가능한 화면),
 * 브라우저가 붙은 뒤 실제 사용자 상태로 교체한다.
 * 로그인 사용자에게는 하트가 잠깐 빈 채로 보였다가 채워진다 — 캐시를 살리기 위한 의도된 트레이드오프.
 */
export function useViewerState(): ViewerState {
  const [state, setState] = useState<ViewerState>(PENDING);

  useEffect(() => {
    let alive = true;
    void loadViewerState().then((next) => {
      if (alive) setState(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
