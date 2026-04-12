import { describe, it, expect } from "vitest";
import { render, screen } from "../../utils";
import { ArtistHeader } from "@/components/artists/ArtistHeader";

describe("ArtistHeader", () => {
  const mockArtist = {
    id: "test-1",
    title: "테스트 아티스트",
    address: "서울 강남구",
    likes_count: 100,
    views_count: 500,
    instagram_url: "https://instagram.com/test",
    kakao_url: "https://kakao.com/test",
    introduce: "테스트 소개글입니다.",
    lat: null,
    lon: null,
    region: {
      id: "seoul",
      name: "서울",
    },
    portfolioImage: null,
  };

  const defaultProps = {
    portfolioImages: [] as string[],
    avatarUrl: null as string | null,
    reviewCount: 10,
  };

  it("아티스트 이름이 표시됨", () => {
    render(
      <ArtistHeader
        artist={mockArtist as never}
        {...defaultProps}
      />
    );
    expect(screen.getByText("테스트 아티스트")).toBeInTheDocument();
  });

  it("지역 이름이 표시됨", () => {
    render(
      <ArtistHeader
        artist={mockArtist as never}
        {...defaultProps}
      />
    );
    expect(screen.getByText("서울")).toBeInTheDocument();
  });

  it("region이 없으면 address를 표시함", () => {
    const artistNoRegion = { ...mockArtist, region: null };
    render(
      <ArtistHeader
        artist={artistNoRegion as never}
        {...defaultProps}
      />
    );
    expect(screen.getByText("서울 강남구")).toBeInTheDocument();
  });

  it("조회수가 표시됨", () => {
    render(
      <ArtistHeader
        artist={mockArtist as never}
        {...defaultProps}
      />
    );
    expect(screen.getByText("500")).toBeInTheDocument();
  });

  it("리뷰 수가 표시됨", () => {
    render(
      <ArtistHeader
        artist={mockArtist as never}
        {...defaultProps}
        reviewCount={42}
      />
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("좋아요 버튼에 aria-label이 있음", () => {
    render(
      <ArtistHeader
        artist={mockArtist as never}
        {...defaultProps}
      />
    );
    expect(screen.getByLabelText("좋아요")).toBeInTheDocument();
  });

  it("소개글이 표시됨", () => {
    render(
      <ArtistHeader
        artist={mockArtist as never}
        {...defaultProps}
      />
    );
    expect(screen.getByText("테스트 소개글입니다.")).toBeInTheDocument();
  });

  it("소개글이 없으면 CollapsibleIntro 미표시", () => {
    const artistNoIntro = { ...mockArtist, introduce: null };
    render(
      <ArtistHeader
        artist={artistNoIntro as never}
        {...defaultProps}
      />
    );
    expect(screen.queryByText("더보기")).not.toBeInTheDocument();
  });
});
