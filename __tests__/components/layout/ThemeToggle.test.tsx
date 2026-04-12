import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const mockSetTheme = vi.fn();
let mockResolvedTheme = "light";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: mockResolvedTheme,
    setTheme: mockSetTheme,
  }),
}));

const DEFAULT_LABEL = "Toggle theme";

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolvedTheme = "light";
  });

  it("기본 aria-label이 'Toggle theme'임", () => {
    render(<ThemeToggle />);
    expect(screen.getByLabelText(DEFAULT_LABEL)).toBeInTheDocument();
  });

  it("커스텀 label prop이 적용됨", () => {
    render(<ThemeToggle label="테마 전환" />);
    expect(screen.getByLabelText("테마 전환")).toBeInTheDocument();
  });

  it("라이트 모드에서 클릭 시 다크 모드로 전환", async () => {
    mockResolvedTheme = "light";
    const { user } = render(<ThemeToggle />);
    await user.click(screen.getByLabelText(DEFAULT_LABEL));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("다크 모드에서 클릭 시 라이트 모드로 전환", async () => {
    mockResolvedTheme = "dark";
    const { user } = render(<ThemeToggle />);
    await user.click(screen.getByLabelText(DEFAULT_LABEL));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("다크 모드에서 aria-pressed가 true임", () => {
    mockResolvedTheme = "dark";
    render(<ThemeToggle />);
    expect(screen.getByLabelText(DEFAULT_LABEL)).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("라이트 모드에서 aria-pressed가 false임", () => {
    mockResolvedTheme = "light";
    render(<ThemeToggle />);
    expect(screen.getByLabelText(DEFAULT_LABEL)).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
});
