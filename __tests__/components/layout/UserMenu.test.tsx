import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import { UserMenu } from "@/components/layout/UserMenu";
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

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("유저가 없으면 로그인 버튼이 표시됨", () => {
    render(<UserMenu user={null} />);
    expect(screen.getByLabelText("로그인")).toBeInTheDocument();
  });

  it("로그인 버튼이 /login 으로 연결됨", () => {
    render(<UserMenu user={null} />);
    expect(screen.getByLabelText("로그인").closest("a")).toHaveAttribute("href", "/login");
  });
});

// 로그인 상태 메뉴는 next/dynamic 으로 분리돼 있어(UserMenu → LoggedInUserMenu → UserMenuContent)
// 실제 마크업을 가진 컴포넌트를 직접 렌더한다.
describe("LoggedInUserMenu", () => {
  it("유저 메뉴 트리거가 표시됨", () => {
    render(<LoggedInUserMenu user={{ id: "u1", email: TEST_EMAIL, name: "테스트" }} />);
    expect(screen.getByLabelText("User menu")).toBeInTheDocument();
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

  it("로그아웃 클릭 시 signOut이 호출됨", async () => {
    mockSignOut.mockResolvedValue(undefined);
    const { user } = render(
      <UserMenuContent user={{ id: "u1", email: TEST_EMAIL, name: "테스트" }} />
    );
    await user.click(screen.getByText("로그아웃"));
    expect(mockSignOut).toHaveBeenCalled();
  });
});
