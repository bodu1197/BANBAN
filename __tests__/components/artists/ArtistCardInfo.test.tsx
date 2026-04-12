import { describe, it, expect } from "vitest";
import { render, screen } from "../../utils";
import { ArtistCardInfo } from "@/components/artists/ArtistCardInfo";

describe("ArtistCardInfo", () => {
  const defaultProps = {
    name: "테스트 아티스트",
    region: "서울 강남",
    likesCount: 100,
    genres: ["블랙워크", "미니멀"],
  };

  it("아티스트 이름이 표시됨", () => {
    render(<ArtistCardInfo {...defaultProps} />);
    expect(screen.getByText("테스트 아티스트")).toBeInTheDocument();
  });

  it("지역이 표시됨", () => {
    render(<ArtistCardInfo {...defaultProps} />);
    expect(screen.getByText("서울 강남")).toBeInTheDocument();
  });

  it("좋아요 수가 표시됨", () => {
    render(<ArtistCardInfo {...defaultProps} />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("장르 뱃지가 최대 2개까지 표시됨", () => {
    render(<ArtistCardInfo {...defaultProps} />);
    expect(screen.getByText("블랙워크")).toBeInTheDocument();
    expect(screen.getByText("미니멀")).toBeInTheDocument();
  });

  it("장르가 3개 이상이면 +N 뱃지 표시", () => {
    render(
      <ArtistCardInfo
        {...defaultProps}
        genres={["블랙워크", "미니멀", "레터링", "기하학"]}
      />
    );
    expect(screen.getByText("블랙워크")).toBeInTheDocument();
    expect(screen.getByText("미니멀")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.queryByText("레터링")).not.toBeInTheDocument();
  });

  it("장르가 없으면 뱃지 미표시", () => {
    render(<ArtistCardInfo {...defaultProps} genres={[]} />);
    expect(screen.queryByText("블랙워크")).not.toBeInTheDocument();
  });
});
