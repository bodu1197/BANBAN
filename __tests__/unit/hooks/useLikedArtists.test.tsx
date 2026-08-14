import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const toggleLike = vi.fn();
const fetchViewerState = vi.fn();

vi.mock("@/lib/actions/likes", () => ({ toggleLike: (id: string) => toggleLike(id) }));
vi.mock("@/lib/actions/viewer", () => ({ fetchViewerState: () => fetchViewerState() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

/** useViewerState 가 등록한 onAuthStateChange 콜백 — 테스트에서 계정 전환을 흉내내는 손잡이. */
let authCallback: ((event: string, session: { user: { id: string } } | null) => void) | null = null;
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (cb: (event: string, session: { user: { id: string } } | null) => void) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: () => undefined } } };
      },
    },
  }),
}));

/** 모듈 스코프 override/pending 을 쓰므로 케이스마다 새로 불러온다. */
async function loadHook(): Promise<typeof import("@/hooks/useLikedArtists")["useLikedArtists"]> {
  vi.resetModules();
  const mod = await import("@/hooks/useLikedArtists");
  return mod.useLikedArtists;
}

beforeEach(() => {
  toggleLike.mockReset();
  fetchViewerState.mockReset();
  fetchViewerState.mockResolvedValue({ isLoggedIn: true, likedArtistIds: [], loaded: true });
});
afterEach(() => { vi.resetModules(); });

describe("useLikedArtists", () => {
  it("서버 확정 전에는 토글을 거부한다 — 열어두면 화면 +1 / 서버 해제로 어긋난다", async () => {
    fetchViewerState.mockReturnValue(new Promise(() => { /* 영원히 대기 */ }));
    const useLikedArtists = await loadHook();
    const { result } = renderHook(() => useLikedArtists());

    let ok = true;
    await act(async () => { ok = await result.current.toggleArtistLike("a1"); });
    expect(ok).toBe(false);
    expect(toggleLike).not.toHaveBeenCalled();
  });

  it("낙관적으로 켠 뒤 서버가 성공하면 유지된다", async () => {
    toggleLike.mockResolvedValue({ success: true, isLiked: true });
    const useLikedArtists = await loadHook();
    const { result } = renderHook(() => useLikedArtists());
    await waitFor(() => { expect(result.current.loaded).toBe(true); });

    await act(async () => { await result.current.toggleArtistLike("a1"); });
    expect(result.current.likedIds.has("a1")).toBe(true);
  });

  it("서버가 거부하면 하트를 되돌리고 false 를 돌려준다 — 호출부가 개수도 되돌릴 수 있어야 한다", async () => {
    toggleLike.mockResolvedValue({ success: false, isLiked: false, error: "unauthorized" });
    const useLikedArtists = await loadHook();
    const { result } = renderHook(() => useLikedArtists());
    await waitFor(() => { expect(result.current.loaded).toBe(true); });

    let ok = true;
    await act(async () => { ok = await result.current.toggleArtistLike("a1"); });
    expect(ok).toBe(false);
    expect(result.current.likedIds.has("a1")).toBe(false);
  });

  it("응답 전 두 번째 클릭은 무시한다 — 서버액션이 2번 나가면 최종 상태가 화면과 반대가 된다", async () => {
    let release: (v: unknown) => void = () => undefined;
    toggleLike.mockReturnValue(new Promise((r) => { release = r; }));
    const useLikedArtists = await loadHook();
    const { result } = renderHook(() => useLikedArtists());
    await waitFor(() => { expect(result.current.loaded).toBe(true); });

    let second = true;
    await act(async () => {
      void result.current.toggleArtistLike("a1");
      second = await result.current.toggleArtistLike("a1");
    });
    expect(second).toBe(false);
    expect(toggleLike).toHaveBeenCalledTimes(1);

    await act(async () => { release({ success: true, isLiked: true }); });
  });

  it("계정이 바뀌면 이전 사용자의 낙관적 하트가 남지 않는다", async () => {
    toggleLike.mockResolvedValue({ success: true, isLiked: true });
    const useLikedArtists = await loadHook();
    const { result } = renderHook(() => useLikedArtists());
    await waitFor(() => { expect(result.current.loaded).toBe(true); });

    await act(async () => { await result.current.toggleArtistLike("a1"); });
    expect(result.current.likedIds.has("a1")).toBe(true);

    // 인증 구독은 동적 import 라 붙는 데 한 틱 걸린다.
    await waitFor(() => { expect(authCallback).not.toBeNull(); });
    fetchViewerState.mockResolvedValue({ isLoggedIn: true, likedArtistIds: [], loaded: true });
    await act(async () => {
      authCallback?.("SIGNED_IN", { user: { id: "user-a" } });   // 기준선
      authCallback?.("SIGNED_IN", { user: { id: "user-b" } });   // 계정 전환
      await Promise.resolve();
    });

    await waitFor(() => { expect(result.current.likedIds.has("a1")).toBe(false); });
  });
});
