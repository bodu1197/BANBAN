// @client-reason: URL 쿼리를 렌더 경로 밖에서 구독 — useSearchParams() 는 프리렌더를 통째로 깬다
"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * `router.push` 는 popstate 를 발생시키지 않는다. 우리 스스로 URL 을 바꿨을 때 구독자에게 알리는 채널.
 */
const URL_CHANGE_EVENT = "banunni:urlchange";

/**
 * 필터 URL 을 바꾼다 — **URL 변경은 반드시 이 함수로 한다.**
 *
 * `router.push` 를 쓰면 안 되는 이유: App Router 는 히스토리 갱신을 트랜지션 안에서 커밋하므로
 * 호출 직후 `location.search` 가 아직 옛 값이다. 그래서 갱신 알림을 언제 쏴야 할지 알 수 없고,
 * 실제로 "URL 만 바뀌고 목록은 그대로"인 상태가 재현됐다(2026-08-14 실측).
 *
 * 네이티브 `history.pushState` 는 `location` 을 **동기적으로** 갱신하고, Next 14.1+ 는 이를
 * 내부 라우터 상태에 반영한다 — 한 번만 알리면 되고 경합이 없다.
 * 이 목록들의 데이터는 클라이언트(react-query)가 다시 가져오므로 서버 재렌더가 필요 없다.
 */
export function pushUrl(url: string): void {
  if (typeof globalThis.history === "undefined") return;
  // 같은 출처 경로만 — 이 함수는 필터 URL 전용이고, 바깥 주소를 여기로 흘리면 조용한 이탈이 된다.
  if (!url.startsWith("/")) return;
  globalThis.history.pushState(null, "", url);
  globalThis.dispatchEvent(new Event(URL_CHANGE_EVENT));
}

/**
 * 현재 쿼리에 `updates` 를 덮은 경로. 값이 비면(`null`/`""`) 그 키를 지운다.
 * 목록 3곳(/artists · /events · 포폴 목록)이 글자 하나 다르지 않게 복붙해 쓰던 로직이다.
 */
export function buildUpdatedPath(
  pathname: string,
  current: URLSearchParams,
  updates: Partial<Record<string, string | null>>,
): string {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "" || value === undefined) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** 필터 갱신의 단일 진입점 — 경로를 만들고 곧바로 반영한다. */
export function pushParams(
  pathname: string,
  current: URLSearchParams,
  updates: Partial<Record<string, string | null>>,
): void {
  pushUrl(buildUpdatedPath(pathname, current, updates));
}

function subscribe(onChange: () => void): () => void {
  globalThis.addEventListener("popstate", onChange);
  globalThis.addEventListener(URL_CHANGE_EVENT, onChange);
  return () => {
    globalThis.removeEventListener("popstate", onChange);
    globalThis.removeEventListener(URL_CHANGE_EVENT, onChange);
  };
}

const getSnapshot = (): string => globalThis.location.search;
/** 서버·프리렌더에서는 항상 "쿼리 없음" — 이게 크롤러가 보는 화면이자 캐시되는 화면이다. */
const getServerSnapshot = (): string => "";

/**
 * 현재 URL 쿼리스트링.
 *
 * `useSearchParams()` 를 쓰지 않는 이유: 정적 프리렌더 중 그 훅은 바일아웃을 던져
 * 가장 가까운 Suspense 경계까지가 클라이언트 전용으로 떨어진다. 목록 페이지들이 그 탓에
 * 서버 HTML 본문 0자로 나갔고(2026-08-14 SEO 사고), 임시로 force-dynamic 을 걸어 캐시를 포기했었다.
 *
 * `useSyncExternalStore` 의 server snapshot 을 빈 문자열로 두면 프리렌더는 기본 목록을 그대로 그리고,
 * 브라우저가 붙은 뒤 실제 쿼리가 반영된다 — 페이지는 정적으로 유지되고 본문도 남는다.
 * (같은 트레이드오프의 선례: ShopBlogClient 의 ?tab= 딥링크 처리.)
 */
export function useUrlSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => new URLSearchParams(search), [search]);
}
