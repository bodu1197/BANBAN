import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../utils";
import { ArtistCardImage } from "@/components/artists/ArtistCardImage";

vi.mock("@/lib/geo", () => ({
  formatDistance: (d: number) => `${d}km`,
}));

const LIKE_LABEL = "Like artist";
const UNLIKE_LABEL = "Unlike artist";

describe("ArtistCardImage", () => {
  const defaultProps = {
    imageUrl: "/test-image.jpg",
    name: "테스트 아티스트",
    isLiked: false,
    onLikeClick: vi.fn(),
  };

  it("이미지가 올바른 src와 alt로 렌더링됨", () => {
    render(<ArtistCardImage {...defaultProps} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/test-image.jpg");
    expect(img).toHaveAttribute("alt", "테스트 아티스트");
  });

  it("isLiked=false일 때 'Like artist' aria-label 표시", () => {
    render(<ArtistCardImage {...defaultProps} isLiked={false} />);
    expect(
      screen.getByRole("button", { name: LIKE_LABEL })
    ).toBeInTheDocument();
  });

  it("isLiked=true일 때 'Unlike artist' aria-label 표시", () => {
    render(<ArtistCardImage {...defaultProps} isLiked={true} />);
    expect(
      screen.getByRole("button", { name: UNLIKE_LABEL })
    ).toBeInTheDocument();
  });

  it("좋아요 버튼의 aria-pressed가 isLiked와 일치함", () => {
    const { rerender } = render(
      <ArtistCardImage {...defaultProps} isLiked={false} />
    );
    expect(screen.getByRole("button", { name: LIKE_LABEL })).toHaveAttribute(
      "aria-pressed",
      "false"
    );

    rerender(<ArtistCardImage {...defaultProps} isLiked={true} />);
    expect(
      screen.getByRole("button", { name: UNLIKE_LABEL })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("좋아요 버튼 클릭 시 onLikeClick 호출", async () => {
    const onLikeClick = vi.fn();
    const { user } = render(
      <ArtistCardImage {...defaultProps} onLikeClick={onLikeClick} />
    );

    await user.click(screen.getByRole("button", { name: LIKE_LABEL }));
    expect(onLikeClick).toHaveBeenCalled();
  });

  it("distance가 제공되면 거리 뱃지 표시", () => {
    render(<ArtistCardImage {...defaultProps} distance={2.5} />);
    expect(screen.getByText("2.5km")).toBeInTheDocument();
  });

  it("distance가 없으면 거리 뱃지 미표시", () => {
    render(<ArtistCardImage {...defaultProps} />);
    expect(screen.queryByText(/km/)).not.toBeInTheDocument();
  });
});
