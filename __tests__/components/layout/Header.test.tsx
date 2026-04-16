import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../utils";
import { Header } from "@/components/layout/Header";

vi.mock("@/components/layout/HeaderUserSection", () => ({
  HeaderUserSection: () => <div data-testid="header-user-section" />,
}));

vi.mock("@/components/layout/HeaderSearch", () => ({
  HeaderSearchIcon: () => <div data-testid="header-search" />,
}));

vi.mock("@/components/layout/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

describe("Header", () => {
  it("반언니 로고가 렌더링됨", () => {
    render(<Header />);
    expect(screen.getByText("반")).toBeInTheDocument();
    expect(screen.getByText("언니")).toBeInTheDocument();
  });

  it("로고 링크가 / 로 연결됨", () => {
    render(<Header />);
    const logoLink = screen.getByText("반").closest("a");
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("헤더 검색 아이콘이 렌더링됨", () => {
    render(<Header />);
    expect(screen.getByTestId("header-search")).toBeInTheDocument();
  });

  it("테마 토글이 렌더링됨", () => {
    render(<Header />);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });
});
