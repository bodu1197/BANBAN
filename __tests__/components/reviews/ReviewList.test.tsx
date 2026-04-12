import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../utils";
import { ReviewList } from "@/components/reviews/ReviewList";

const TEST_DATE = "2024-01-15T10:00:00Z";

vi.mock("@/components/reviews/ReviewCard", () => ({
  ReviewCard: (props: { authorName: string }) => (
    <div data-testid="review-card">{props.authorName}</div>
  ),
}));

describe("ReviewList", () => {
  it("리뷰가 없으면 빈 메시지 표시", () => {
    render(
      <ReviewList reviews={[]} emptyMessage="리뷰가 없습니다" />
    );
    expect(screen.getByText("리뷰가 없습니다")).toBeInTheDocument();
  });

  it("리뷰 카드가 렌더링됨", () => {
    const reviews = [
      {
        id: "r1",
        rating: 4,
        content: "좋아요",
        user_id: "u1",
        artist_id: "a1",
        reservation_id: null,
        created_at: TEST_DATE,
        updated_at: TEST_DATE,
        deleted_at: null,
        profile: { nickname: "유저1" },
      },
      {
        id: "r2",
        rating: 5,
        content: "최고",
        user_id: "u2",
        artist_id: "a1",
        reservation_id: null,
        created_at: "2024-01-16T10:00:00Z",
        updated_at: "2024-01-16T10:00:00Z",
        deleted_at: null,
        profile: { nickname: "유저2" },
      },
    ];

    render(
      <ReviewList reviews={reviews} emptyMessage="리뷰가 없습니다" />
    );
    const cards = screen.getAllByTestId("review-card");
    expect(cards).toHaveLength(2);
  });

  it("profile이 없으면 Anonymous를 전달함", () => {
    const reviews = [
      {
        id: "r1",
        rating: 4,
        content: "좋아요",
        user_id: "u1",
        artist_id: "a1",
        reservation_id: null,
        created_at: TEST_DATE,
        updated_at: TEST_DATE,
        deleted_at: null,
        profile: null,
      },
    ];

    render(
      <ReviewList reviews={reviews} emptyMessage="리뷰가 없습니다" />
    );
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });
});
