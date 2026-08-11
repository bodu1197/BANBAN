import { describe, it, expect } from "vitest";
import { render, screen } from "../../utils";
import { Footer } from "@/components/layout/Footer";
import { STRINGS } from "@/lib/strings";

const f = STRINGS.footer;

describe("Footer", () => {
  it("모든 푸터 링크가 렌더링됨", () => {
    render(<Footer />);
    for (const label of [f.about, f.terms, f.privacy, "반품/환불", f.contact, f.partnership]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("링크 href가 올바름", () => {
    render(<Footer />);
    expect(screen.getByText(f.about).closest("a")).toHaveAttribute("href", "/about");
    expect(screen.getByText(f.terms).closest("a")).toHaveAttribute("href", "/terms");
    expect(screen.getByText("반품/환불").closest("a")).toHaveAttribute("href", "/refund-policy");
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
