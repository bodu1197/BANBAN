import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import { BottomNav } from "@/components/layout/BottomNav";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
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

  it("5개의 네비게이션 항목을 렌더링함", () => {
    render(<BottomNav />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(5);
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

  it("pathname이 /events이면 이벤트가 활성", () => {
    mockPathname = "/events";
    render(<BottomNav />);
    expect(screen.getByText("이벤트")).toHaveAttribute(DATA_ACTIVE, "true");
    expect(screen.getByText("홈")).toHaveAttribute(DATA_ACTIVE, "false");
  });

  it("숨김 경로(/register/artist)에서는 아무것도 렌더링하지 않음", () => {
    mockPathname = "/register/artist";
    const { container } = render(<BottomNav />);
    expect(container).toBeEmptyDOMElement();
  });
});
