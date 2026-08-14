import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUrlSearchParams, pushUrl } from "@/hooks/useUrlSearchParams";

/**
 * 이 훅은 목록 4개(/artists, /events, /women-beauty, /mens-beauty, /portfolios)의 필터가 전부
 * 의존하는 축이다. 여기가 깨지면 "URL 은 바뀌는데 목록은 그대로"가 되고, 서버 스냅샷이 ""가
 * 아니게 되면 프리렌더가 다시 깨져 본문 0자 사고(2026-08-14)가 재발한다.
 */
afterEach(() => {
  globalThis.history.replaceState(null, "", "/");
});

describe("useUrlSearchParams", () => {
  it("현재 쿼리를 읽는다", () => {
    globalThis.history.replaceState(null, "", "/artists?regionSido=부산");
    const { result } = renderHook(() => useUrlSearchParams());
    expect(result.current.get("regionSido")).toBe("부산");
  });

  it("pushUrl 이 location 과 구독자를 같은 틱에 갱신한다 — 지연 알림은 경합이 된다", () => {
    globalThis.history.replaceState(null, "", "/artists");
    const { result } = renderHook(() => useUrlSearchParams());
    expect(result.current.get("region")).toBeNull();

    act(() => { pushUrl("/artists?region=r1"); });

    expect(globalThis.location.search).toBe("?region=r1");
    expect(result.current.get("region")).toBe("r1");
  });

  it("뒤로가기(popstate)에도 반응한다", () => {
    globalThis.history.replaceState(null, "", "/artists");
    const { result } = renderHook(() => useUrlSearchParams());
    act(() => { pushUrl("/artists?q=눈썹"); });
    expect(result.current.get("q")).toBe("눈썹");

    act(() => {
      globalThis.history.replaceState(null, "", "/artists");
      globalThis.dispatchEvent(new Event("popstate"));
    });
    expect(result.current.get("q")).toBeNull();
  });

  it("언마운트하면 리스너를 뗀다 — 남으면 라우트를 옮길 때마다 누적된다", () => {
    const { unmount } = renderHook(() => useUrlSearchParams());
    unmount();
    // 구독이 남아 있으면 이 dispatch 가 언마운트된 컴포넌트의 setState 를 부른다.
    expect(() => { globalThis.dispatchEvent(new Event("popstate")); }).not.toThrow();
  });

  it("서버 스냅샷은 항상 빈 쿼리다 — 프리렌더가 필터 없는 기본 목록을 그려야 캐시된다", async () => {
    const { renderToString } = await import("react-dom/server");
    globalThis.history.replaceState(null, "", "/artists?region=r1");

    function Probe(): React.ReactElement {
      const params = useUrlSearchParams();
      return <span>{params.get("region") ?? "none"}</span>;
    }

    expect(renderToString(<Probe />)).toContain("none");
  });
});
