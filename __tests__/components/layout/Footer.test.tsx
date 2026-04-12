import { describe, it, expect } from "vitest";
import { render, screen } from "../../utils";
import { Footer } from "@/components/layout/Footer";

describe("Footer", () => {
  it("모든 푸터 링크가 렌더링됨", () => {
    render(<Footer />);
    expect(screen.getByText("소개")).toBeInTheDocument();
    expect(screen.getByText("이용약관")).toBeInTheDocument();
    expect(screen.getByText("개인정보처리방침")).toBeInTheDocument();
    expect(screen.getByText("문의하기")).toBeInTheDocument();
    expect(screen.getByText("제휴 문의")).toBeInTheDocument();
  });

  it("링크 href가 올바름", () => {
    render(<Footer />);
    expect(screen.getByText("소개").closest("a")).toHaveAttribute(
      "href",
      "/about"
    );
    expect(screen.getByText("이용약관").closest("a")).toHaveAttribute(
      "href",
      "/terms"
    );
  });

  it("저작권 텍스트가 표시됨", () => {
    render(<Footer />);
    const copyrightRegex = /© \d{4} 반언니/;
    expect(screen.getByText(copyrightRegex)).toBeInTheDocument();
  });

  it("Footer navigation aria-label이 있음", () => {
    render(<Footer />);
    expect(
      screen.getByRole("navigation", { name: "Footer navigation" })
    ).toBeInTheDocument();
  });
});
