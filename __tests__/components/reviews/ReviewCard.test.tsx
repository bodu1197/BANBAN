import { describe, it, expect } from "vitest";
import { render, screen } from "../../utils";
import { ReviewCard } from "@/components/reviews/ReviewCard";

const DEFAULT_CONTENT = "좋은 타투 아티스트입니다.";
const DEFAULT_CREATED_AT = "2024-01-15T10:00:00Z";

describe("ReviewCard", () => {
  const defaultProps = {
    rating: 4,
    content: DEFAULT_CONTENT,
    authorName: "테스트유저",
    createdAt: DEFAULT_CREATED_AT,
      };

  it("작성자 이름이 표시됨", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(screen.getByText("테스트유저")).toBeInTheDocument();
  });

  it("리뷰 내용이 표시됨", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(screen.getByText(DEFAULT_CONTENT)).toBeInTheDocument();
  });

  it("time 요소에 dateTime 속성이 있음", () => {
    const { container } = render(<ReviewCard {...defaultProps} />);
    const timeEl = container.querySelector("time");
    expect(timeEl).toHaveAttribute("dateTime", DEFAULT_CREATED_AT);
    // 상대 시간 문구는 '오래 전' 고정값이 아니라 경과분에 따라 계산된다 — 비어있지만 않으면 된다.
    expect(timeEl?.textContent?.trim()).toBeTruthy();
  });

  it("별점 컴포넌트가 렌더링됨", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(
      screen.getByLabelText("4 out of 5 stars")
    ).toBeInTheDocument();
  });

  it("미래 날짜여도 음수 시간이 나오지 않음", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { container } = render(<ReviewCard {...defaultProps} createdAt={future} />);
    expect(container.querySelector("time")?.textContent).not.toMatch(/-/);
  });
});
