import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../utils";
import { ArtistGrid } from "@/components/artists/ArtistGrid";

vi.mock("@/components/artists/ArtistCard", () => ({
  ArtistCard: (props: { id: string; name: string }) => (
    <div data-testid={`artist-${props.id}`}>{props.name}</div>
  ),
}));

vi.mock("@/components/artists/ArtistCardSkeleton", () => ({
  ArtistCardSkeleton: () => <div data-testid="skeleton" />,
}));

describe("ArtistGrid", () => {
  const mockArtists = [
    {
      id: "1",
      name: "아티스트1",
      region: "서울",
      profileImage: null,
      portfolioImage: "/img1.jpg",
      genres: [],
      likesCount: 10,
    },
    {
      id: "2",
      name: "아티스트2",
      region: "부산",
      profileImage: null,
      portfolioImage: "/img2.jpg",
      genres: [],
      likesCount: 20,
    },
  ];

  it("isLoading=true이면 스켈레톤 카드를 표시함", () => {
    render(
      <ArtistGrid artists={[]} isLoading={true} />
    );
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons).toHaveLength(8); // 기본값
  });

  it("skeletonCount에 맞는 개수의 스켈레톤을 표시함", () => {
    render(
      <ArtistGrid artists={[]} isLoading={true} skeletonCount={4} />
    );
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons).toHaveLength(4);
  });

  it("아티스트가 없으면 빈 메시지를 표시함", () => {
    render(<ArtistGrid artists={[]} />);
    expect(screen.getByText("No artists found")).toBeInTheDocument();
  });

  it("커스텀 emptyMessage가 표시됨", () => {
    render(
      <ArtistGrid
        artists={[]}
        emptyMessage="검색 결과가 없습니다"
      />
    );
    expect(screen.getByText("검색 결과가 없습니다")).toBeInTheDocument();
  });

  it("아티스트 카드를 렌더링함", () => {
    render(<ArtistGrid artists={mockArtists} />);
    expect(screen.getByTestId("artist-1")).toBeInTheDocument();
    expect(screen.getByTestId("artist-2")).toBeInTheDocument();
    expect(screen.getByText("아티스트1")).toBeInTheDocument();
    expect(screen.getByText("아티스트2")).toBeInTheDocument();
  });
});
