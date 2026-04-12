import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import { DesktopNav, MobileNav } from "@/components/layout/NavLinks";

const mockSignOut = vi.fn();
const TEST_EMAIL = "test@test.com";

vi.mock("@/lib/supabase/auth", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

describe("DesktopNav", () => {
  const defaultProps = {
    labels: {
      home: "홈",
      search: "검색",
      tattoo: "타투",
      community: "커뮤니티",
    },
  };

  it("내비게이션 링크가 렌더링됨", () => {
    render(<DesktopNav {...defaultProps} />);
    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("타투")).toBeInTheDocument();
    expect(screen.getByText("커뮤니티")).toBeInTheDocument();
  });

  it("Main navigation aria-label이 있음", () => {
    render(<DesktopNav {...defaultProps} />);
    expect(
      screen.getByRole("navigation", { name: "Main navigation" })
    ).toBeInTheDocument();
  });
});

describe("MobileNav", () => {
  const defaultProps = {
    labels: {
      home: "홈",
      search: "검색",
      tattoo: "타투",
      likes: "좋아요",
      mypage: "MY",
    },
    loginLabel: "로그인",
    logoutLabel: "로그아웃",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모든 네비게이션 링크가 렌더링됨", () => {
    render(<MobileNav {...defaultProps} />);
    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("타투")).toBeInTheDocument();
    expect(screen.getByText("좋아요")).toBeInTheDocument();
    expect(screen.getByText("MY")).toBeInTheDocument();
  });

  it("유저가 없으면 로그인 링크 표시", () => {
    render(<MobileNav {...defaultProps} user={null} />);
    expect(screen.getByText("로그인")).toBeInTheDocument();
  });

  it("유저가 있으면 로그아웃 버튼 표시", () => {
    render(
      <MobileNav
        {...defaultProps}
        user={{ id: "u1", email: TEST_EMAIL, name: "테스트" }}
      />
    );
    expect(screen.getByText("로그아웃")).toBeInTheDocument();
  });

  it("유저 정보가 표시됨", () => {
    render(
      <MobileNav
        {...defaultProps}
        user={{ id: "u1", email: TEST_EMAIL, name: "테스트" }}
      />
    );
    expect(screen.getByText("테스트")).toBeInTheDocument();
  });

  it("Mobile navigation aria-label이 있음", () => {
    render(<MobileNav {...defaultProps} />);
    expect(
      screen.getByRole("navigation", { name: "Mobile navigation" })
    ).toBeInTheDocument();
  });

  it("로그아웃 버튼 클릭 시 signOut이 호출됨", async () => {
    mockSignOut.mockResolvedValue(undefined);
    const { user } = render(
      <MobileNav
        {...defaultProps}
        user={{ id: "u1", email: TEST_EMAIL, name: "테스트" }}
      />
    );
    await user.click(screen.getByText("로그아웃"));
    expect(mockSignOut).toHaveBeenCalledWith();
  });
});
