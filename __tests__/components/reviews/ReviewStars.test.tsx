import { describe, it, expect } from "vitest";
import { render, screen } from "../../utils";
import { ReviewStars } from "@/components/reviews/ReviewStars";

describe("ReviewStars", () => {
  it("기본 5개 별이 렌더링됨", () => {
    render(<ReviewStars rating={3} />);
    expect(
      screen.getByLabelText("3 out of 5 stars")
    ).toBeInTheDocument();
  });

  it("aria-label에 평점 텍스트가 포함됨", () => {
    render(<ReviewStars rating={4.5} />);
    expect(
      screen.getByLabelText("4.5 out of 5 stars")
    ).toBeInTheDocument();
  });

  it("커스텀 maxRating이 동작함", () => {
    render(<ReviewStars rating={2} maxRating={3} />);
    expect(
      screen.getByLabelText("2 out of 3 stars")
    ).toBeInTheDocument();
  });
});
