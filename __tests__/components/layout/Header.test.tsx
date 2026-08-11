import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../utils";
import { Header } from "@/components/layout/Header";

vi.mock("@/components/layout/HeaderUserSection", () => ({
  HeaderUserSection: () => <div data-testid="header-user-section" />,
}));

vi.mock("@/components/layout/HeaderStickySearch", () => ({
  HeaderStickySearch: () => <div data-testid="header-search" />,
}));

describe("Header", () => {
  it("반언니 로고 이미지가 렌더링됨", () => {
    render(<Header />);
    expect(screen.getByAltText("반언니")).toBeInTheDocument();
  });

  it("로고 링크가 / 로 연결됨", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: "반언니 홈으로 이동" })).toHaveAttribute("href", "/");
  });

  it("헤더 검색이 렌더링됨", () => {
    render(<Header />);
    expect(screen.getByTestId("header-search")).toBeInTheDocument();
  });
});
