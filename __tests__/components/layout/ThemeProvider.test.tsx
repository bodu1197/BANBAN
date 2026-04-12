import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../utils";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

describe("ThemeProvider", () => {
  it("children을 렌더링함", () => {
    render(
      <ThemeProvider>
        <span>테스트 콘텐츠</span>
      </ThemeProvider>
    );
    expect(screen.getByText("테스트 콘텐츠")).toBeInTheDocument();
  });

  it("NextThemesProvider로 감싸짐", () => {
    render(
      <ThemeProvider>
        <span>내부</span>
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
  });
});
