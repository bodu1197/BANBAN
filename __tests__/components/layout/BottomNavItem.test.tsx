import { describe, it, expect } from "vitest";
import { render, screen } from "../../utils";
import { BottomNavItem } from "@/components/layout/BottomNavItem";
import { Home } from "lucide-react";

describe("BottomNavItem", () => {
  const defaultProps = {
    href: "/ko",
    label: "홈",
    icon: Home,
    isActive: false,
  };

  it("올바른 href로 링크가 렌더링됨", () => {
    render(<BottomNavItem {...defaultProps} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/ko");
  });

  it("라벨 텍스트가 표시됨", () => {
    render(<BottomNavItem {...defaultProps} />);
    expect(screen.getByText("홈")).toBeInTheDocument();
  });

  it("isActive=true이면 aria-current='page' 설정", () => {
    render(<BottomNavItem {...defaultProps} isActive={true} />);
    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
  });

  it("isActive=false이면 aria-current 미설정", () => {
    render(<BottomNavItem {...defaultProps} isActive={false} />);
    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
  });
});
