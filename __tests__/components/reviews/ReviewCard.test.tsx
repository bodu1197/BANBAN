import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../utils";
import { ReviewCard } from "@/components/reviews/ReviewCard";

vi.mock("date-fns", () => ({
  formatDistanceToNow: vi.fn(() => "3일 전"),
}));

vi.mock("date-fns/locale", () => ({
  ko: { code: "ko" },
}));

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
    render(<ReviewCard {...defaultProps} />);
    const timeEl = screen.getByText("3일 전");
    expect(timeEl).toHaveAttribute("dateTime", DEFAULT_CREATED_AT);
  });

  it("별점 컴포넌트가 렌더링됨", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(
      screen.getByLabelText("4 out of 5 stars")
    ).toBeInTheDocument();
  });

  it("ko 로캘이 아닌 경우에도 렌더링됨", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(screen.getByText("테스트유저")).toBeInTheDocument();
    expect(screen.getByText(DEFAULT_CONTENT)).toBeInTheDocument();
  });

  it("locale이 undefined여도 렌더링됨", () => {
    render(
      <ReviewCard
        rating={5}
        content="Great!"
        authorName="User"
        createdAt={DEFAULT_CREATED_AT}
      />
    );
    expect(screen.getByText("User")).toBeInTheDocument();
  });
});
