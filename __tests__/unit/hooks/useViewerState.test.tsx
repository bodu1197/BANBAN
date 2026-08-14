import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const fetchViewerState = vi.fn();
vi.mock("@/lib/actions/viewer", () => ({ fetchViewerState: () => fetchViewerState() }));

// 모듈 스코프 in-flight 캐시를 쓰므로 매 케이스마다 모듈을 새로 불러온다.
async function loadHook(): Promise<typeof import("@/hooks/useViewerState")["useViewerState"]> {
  vi.resetModules();
  const mod = await import("@/hooks/useViewerState");
  return mod.useViewerState;
}

beforeEach(() => { fetchViewerState.mockReset(); });
afterEach(() => { vi.resetModules(); });

describe("useViewerState — 서버는 로그아웃, 클라이언트가 개인화", () => {
  it("첫 렌더는 loaded=false 로 시작한다 — 이때 좋아요 토글이 열려 있으면 서버와 어긋난다", async () => {
    fetchViewerState.mockReturnValue(new Promise(() => { /* 영원히 대기 */ }));
    const useViewerState = await loadHook();
    const { result } = renderHook(() => useViewerState());
    expect(result.current).toEqual({ isLoggedIn: false, likedArtistIds: [], loaded: false });
  });

  it("응답이 오면 로그인 상태와 좋아요 목록으로 교체된다", async () => {
    fetchViewerState.mockResolvedValue({ isLoggedIn: true, likedArtistIds: ["a1"], loaded: true });
    const useViewerState = await loadHook();
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => { expect(result.current.loaded).toBe(true); });
    expect(result.current).toEqual({ isLoggedIn: true, likedArtistIds: ["a1"], loaded: true });
  });

  it("조회 실패해도 loaded=true 로 확정한다 — 잠그면 좋아요가 영구히 죽는다", async () => {
    fetchViewerState.mockRejectedValue(new Error("network"));
    const useViewerState = await loadHook();
    const { result } = renderHook(() => useViewerState());
    await waitFor(() => { expect(result.current.loaded).toBe(true); });
    expect(result.current.isLoggedIn).toBe(false);
  });

  it("같은 페이지에서 여러 컴포넌트가 써도 서버 호출은 1회 — 액션 큐가 직렬이라 중복이 곧 지연이다", async () => {
    fetchViewerState.mockResolvedValue({ isLoggedIn: false, likedArtistIds: [], loaded: true });
    const useViewerState = await loadHook();
    const { result: a } = renderHook(() => useViewerState());
    const { result: b } = renderHook(() => useViewerState());
    await waitFor(() => {
      expect(a.current.loaded).toBe(true);
      expect(b.current.loaded).toBe(true);
    });
    expect(fetchViewerState).toHaveBeenCalledTimes(1);
  });
});
