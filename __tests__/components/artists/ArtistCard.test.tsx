import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../utils";
import { ArtistCard } from "@/components/artists/ArtistCard";

describe("ArtistCard", () => {
  const defaultProps = {
    id: "test-id",
    name: "테스트 아티스트",
    region: "서울 강남",
    profileImage: null,
    portfolioImage: "/test-portfolio.jpg",
    genres: ["블랙워크", "미니멀"],
    likesCount: 100,
  };

  type CardProps = React.ComponentProps<typeof ArtistCard>;

  function renderCard(overrides: Partial<CardProps> = {}): ReturnType<typeof render> {
    return render(<ArtistCard {...defaultProps} {...overrides} />);
  }

  it("아티스트 이름이 표시됨", () => {
    renderCard();
    expect(screen.getByText("테스트 아티스트")).toBeInTheDocument();
  });

  it("지역이 표시됨", () => {
    renderCard();
    expect(screen.getByText("서울 강남")).toBeInTheDocument();
  });

  it("좋아요 수가 표시됨", () => {
    renderCard();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("장르 뱃지가 최대 2개까지 표시됨", () => {
    renderCard();
    expect(screen.getByText("블랙워크")).toBeInTheDocument();
    expect(screen.getByText("미니멀")).toBeInTheDocument();
  });

  it("장르가 3개 이상이면 +N 뱃지 표시", () => {
    renderCard({ genres: ["블랙워크", "미니멀", "레터링", "기하학"] });
    expect(screen.getByText("블랙워크")).toBeInTheDocument();
    expect(screen.getByText("미니멀")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.queryByText("레터링")).not.toBeInTheDocument();
  });

  it("아티스트 상세 페이지로 링크됨", () => {
    renderCard();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/artists/test-id");
  });

  it("좋아요 버튼 클릭 시 콜백 호출", async () => {
    const onLikeToggle = vi.fn();
    const { user } = render(
      <ArtistCard {...defaultProps} onLikeToggle={onLikeToggle} />
    );

    await user.click(screen.getByRole("button", { name: /like/i }));
    expect(onLikeToggle).toHaveBeenCalledWith("test-id");
  });

  it("좋아요 상태에 따라 버튼 스타일 변경", () => {
    const { rerender } = renderCard({ isLiked: false });

    expect(screen.getByRole("button", { name: "Like artist" }))
      .toHaveAttribute("aria-pressed", "false");

    rerender(<ArtistCard {...defaultProps} isLiked={true} />);

    expect(screen.getByRole("button", { name: "Unlike artist" }))
      .toHaveAttribute("aria-pressed", "true");
  });

  it("거리가 있으면 거리 뱃지 표시", () => {
    renderCard({ distance: 2.5 });
    expect(screen.getByText("2.5km")).toBeInTheDocument();
  });

  it("포트폴리오 이미지가 없으면 프로필 이미지 사용", () => {
    renderCard({ portfolioImage: null, profileImage: "/profile.jpg" });
    expect(screen.getByRole("img")).toHaveAttribute("src", "/profile.jpg");
  });

  it("둘 다 없으면 플레이스홀더 이미지 사용", () => {
    renderCard({ portfolioImage: null, profileImage: null });
    expect(screen.getByRole("img")).toHaveAttribute("src", "/placeholder-artist.svg");
  });

  it("장르가 없으면 뱃지 영역 미표시", () => {
    renderCard({ genres: [] });
    expect(screen.queryByText("블랙워크")).not.toBeInTheDocument();
  });
});
