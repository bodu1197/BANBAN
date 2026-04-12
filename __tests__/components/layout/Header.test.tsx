import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../utils";
import { Header } from "@/components/layout/Header";

vi.mock("@/components/layout/NavLinks", () => ({
  MobileNav: () => <nav data-testid="mobile-nav" />,
}));

vi.mock("@/components/layout/MainMenuBar", () => ({
  MainMenuBar: () => <nav data-testid="main-menu-bar" />,
}));

vi.mock("@/components/layout/HeaderSearch", () => ({
  HeaderSearchIcon: () => <div data-testid="header-search" />,
}));

vi.mock("@/components/layout/UserMenu", () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));

vi.mock("@/components/layout/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

describe("Header", () => {
  const defaultProps = {
    user: null,
  };

  it("반언니 로고가 렌더링됨", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText("타투")).toBeInTheDocument();
    expect(screen.getByText("어때")).toBeInTheDocument();
  });

  it("로고 링크가 / 로 연결됨", () => {
    render(<Header {...defaultProps} />);
    const logoLink = screen.getByText("타투").closest("a");
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("메인 메뉴 바가 렌더링됨", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByTestId("main-menu-bar")).toBeInTheDocument();
  });

  it("유저 메뉴가 렌더링됨", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
  });

  it("테마 토글이 렌더링됨", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });
});
