import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import { BottomNav } from "@/components/layout/BottomNav";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useParams: () => ({ }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/layout/BottomNavItem", () => ({
  BottomNavItem: (props: { href: string; label: string; isActive: boolean }) => (
    <a href={props.href} data-active={props.isActive}>
      {props.label}
    </a>
  ),
}));

const DATA_ACTIVE = "data-active";

describe("BottomNav", () => {
  beforeEach(() => {
    mockPathname = "/";
  });

  it("4개의 네비게이션 항목을 렌더링함", () => {
    render(<BottomNav />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
  });

  it('aria-label이 "Bottom navigation"임', () => {
    render(<BottomNav />);
    expect(
      screen.getByRole("navigation", { name: "Bottom navigation" })
    ).toBeInTheDocument();
  });

  it("pathname이 루트와 일치하면 홈 항목이 활성 상태임", () => {
    render(<BottomNav />);
    const homeLink = screen.getByText("홈");
    expect(homeLink).toHaveAttribute(DATA_ACTIVE, "true");
  });

  it("pathname이 /likes이면 좋아요가 활성", () => {
    mockPathname = "/likes";
    render(<BottomNav />);
    const likesLink = screen.getByText("좋아요");
    expect(likesLink).toHaveAttribute(DATA_ACTIVE, "true");
    const homeLink = screen.getByText("홈");
    expect(homeLink).toHaveAttribute(DATA_ACTIVE, "false");
  });
});
