import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "../../utils";
import { HeaderUserSection } from "@/components/layout/HeaderUserSection";

type AuthCallback = (event: string, session: { user?: { id: string; email?: string } } | null) => void;

const listeners: AuthCallback[] = [];
const unsubscribe = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (cb: AuthCallback) => {
        listeners.push(cb);
        return { data: { subscription: { unsubscribe } } };
      },
    },
  }),
}));

vi.mock("@/components/layout/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="bell" />,
}));
vi.mock("@/components/layout/LoggedInUserMenu", () => ({
  LoggedInUserMenu: () => <div data-testid="user-menu" />,
}));
vi.mock("@/components/layout/HeaderMobileMenu", () => ({
  HeaderMobileMenu: () => <div data-testid="mobile-menu" />,
}));

// 헤더는 레이아웃에 있어 로그인 후에도 마운트가 유지된다 → 인증 상태를 구독하지 않으면
// 이메일 로그인(클라 이동) 직후 로그아웃 상태로 굳어버린다(종 없음, 사람 아이콘 → /login).
describe("HeaderUserSection", () => {
  beforeEach(() => {
    listeners.length = 0;
    unsubscribe.mockClear();
  });

  it("비로그인 상태에서는 '로그인' 링크를 보여준다", () => {
    render(<HeaderUserSection />);
    expect(screen.getByText("로그인").closest("a")).toHaveAttribute("href", "/login");
    expect(screen.queryByTestId("bell")).not.toBeInTheDocument();
  });

  it("로그인 이벤트가 오면 새로고침 없이 종 아이콘·유저 메뉴로 바뀐다", async () => {
    render(<HeaderUserSection />);
    await waitFor(() => { expect(listeners).toHaveLength(1); });

    act(() => { listeners[0]("SIGNED_IN", { user: { id: "u1", email: "a@b.co" } }); });

    await waitFor(() => { expect(screen.getByTestId("bell")).toBeInTheDocument(); });
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
    expect(screen.queryByText("로그인")).not.toBeInTheDocument();
  });

  it("로그아웃 이벤트가 오면 다시 '로그인' 링크로 돌아온다", async () => {
    render(<HeaderUserSection />);
    await waitFor(() => { expect(listeners).toHaveLength(1); });

    act(() => { listeners[0]("SIGNED_IN", { user: { id: "u1", email: "a@b.co" } }); });
    await waitFor(() => { expect(screen.getByTestId("bell")).toBeInTheDocument(); });

    act(() => { listeners[0]("SIGNED_OUT", null); });
    await waitFor(() => { expect(screen.getByText("로그인")).toBeInTheDocument(); });
    expect(screen.queryByTestId("bell")).not.toBeInTheDocument();
  });

  it("언마운트하면 구독을 해제한다", async () => {
    const { unmount } = render(<HeaderUserSection />);
    await waitFor(() => { expect(listeners).toHaveLength(1); });
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
