import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import { LoggedInUserMenu } from "@/components/layout/LoggedInUserMenu";
import { UserMenuContent } from "@/components/layout/UserMenuContent";

const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/auth", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  AvatarImage: ({ alt }: { alt?: string; src?: string }) =>
    React.createElement("img", { alt: alt ?? "" }),
  AvatarFallback: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span>{children}</span>,
}));

const TEST_EMAIL = "test@test.com";

describe("LoggedInUserMenu", () => {
  it("트리거에 '마이페이지' 라벨이 보이고 접근명도 같은 말을 쓴다", () => {
    render(<LoggedInUserMenu user={{ id: "u1", email: TEST_EMAIL, name: "테스트" }} />);
    expect(screen.getByText("마이페이지")).toBeInTheDocument();
    // 보이는 라벨과 접근명이 어긋나면 음성 제어로 못 누른다(WCAG 2.5.3).
    expect(screen.getByRole("button", { name: /마이페이지/ })).toBeInTheDocument();
  });

  it("이름 앞 2자가 이니셜", () => {
    render(<LoggedInUserMenu user={{ id: "u1", email: TEST_EMAIL, name: "테스트유저" }} />);
    expect(screen.getByText("테스")).toBeInTheDocument();
  });

  it("이름 없이 이메일만 있으면 이메일 앞 2자가 이니셜", () => {
    render(<LoggedInUserMenu user={{ id: "u1", email: TEST_EMAIL }} />);
    expect(screen.getByText("TE")).toBeInTheDocument();
  });

  it("이름과 이메일 모두 없으면 U가 이니셜", () => {
    render(<LoggedInUserMenu user={{ id: "u1" }} />);
    expect(screen.getByText("U")).toBeInTheDocument();
  });
});

describe("UserMenuContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("마이페이지 링크가 /mypage 로 연결됨", () => {
    render(<UserMenuContent user={{ id: "u1", email: TEST_EMAIL, name: "테스트" }} />);
    expect(screen.getByText("마이페이지").closest("a")).toHaveAttribute("href", "/mypage");
  });

  it("로그아웃 클릭 시 signOut이 호출됨", async () => {
    mockSignOut.mockResolvedValue(undefined);
    const { user } = render(
      <UserMenuContent user={{ id: "u1", email: TEST_EMAIL, name: "테스트" }} />
    );
    await user.click(screen.getByText("로그아웃"));
    expect(mockSignOut).toHaveBeenCalled();
  });
});
