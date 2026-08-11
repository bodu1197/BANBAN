import { describe, it, expect } from "vitest";
import { render, screen } from "../../utils";
import { PortfolioGallery } from "@/components/portfolio/PortfolioGallery";

// 갤러리는 라이트박스를 열지 않고 작품 상세(/portfolios/[id])로 보내는 링크 그리드다.
// 작품당 첫 미디어 1장만 대표로 쓴다.
describe("PortfolioGallery", () => {
  const mockPortfolios = [
    {
      id: "p1",
      title: "포트폴리오1",
      artist_id: "a1",
      portfolio_media: [
        { id: "m1", storage_path: "/img1.jpg", order_index: 0 },
        { id: "m2", storage_path: "/img2.jpg", order_index: 1 },
      ],
    },
    {
      id: "p2",
      title: "포트폴리오2",
      artist_id: "a1",
      portfolio_media: [
        { id: "m3", storage_path: "/img3.jpg", order_index: 0 },
      ],
    },
  ];

  it("작품당 링크 1개(대표 이미지 1장)만 렌더링됨", () => {
    render(<PortfolioGallery portfolios={mockPortfolios as never[]} />);
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("각 링크가 작품 상세로 연결됨", () => {
    render(<PortfolioGallery portfolios={mockPortfolios as never[]} />);
    expect(screen.getByAltText("포트폴리오1").closest("a")).toHaveAttribute("href", "/portfolios/p1");
    expect(screen.getByAltText("포트폴리오2").closest("a")).toHaveAttribute("href", "/portfolios/p2");
  });

  it("미디어가 없는 작품은 건너뛴다", () => {
    const withEmpty = [...mockPortfolios, { id: "p3", title: "빈작품", artist_id: "a1", portfolio_media: [] }];
    render(<PortfolioGallery portfolios={withEmpty as never[]} />);
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByAltText("빈작품")).not.toBeInTheDocument();
  });

  it("포트폴리오가 비어있으면 링크가 없음", () => {
    render(<PortfolioGallery portfolios={[]} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
