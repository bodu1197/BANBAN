import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../utils";
import { PortfolioGallery } from "@/components/portfolio/PortfolioGallery";

vi.mock("@/components/portfolio/ImageLightbox", () => ({
  ImageLightbox: ({
    onClose,
    onPrevious,
    onNext,
    currentIndex,
    totalCount,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onPrevious: () => void;
    onNext: () => void;
    imageSrc: string;
    imageAlt: string;
    currentIndex: number;
    totalCount: number;
  }) => (
    <div data-testid="lightbox">
      <button data-testid="lightbox-close" onClick={onClose}>
        close
      </button>
      <button data-testid="lightbox-prev" onClick={onPrevious}>
        prev
      </button>
      <button data-testid="lightbox-next" onClick={onNext}>
        next
      </button>
      <span data-testid="lightbox-index">{currentIndex}</span>
      <span data-testid="lightbox-total">{totalCount}</span>
    </div>
  ),
}));

const LIGHTBOX_INDEX_ID = "lightbox-index";

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

  it("모든 미디어 항목에 대한 이미지 버튼이 렌더링됨", () => {
    render(<PortfolioGallery portfolios={mockPortfolios as never[]} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("각 버튼이 포트폴리오 제목으로 aria-label을 가짐", () => {
    render(<PortfolioGallery portfolios={mockPortfolios as never[]} />);
    expect(screen.getAllByLabelText("View 포트폴리오1")).toHaveLength(2);
    expect(screen.getByLabelText("View 포트폴리오2")).toBeInTheDocument();
  });

  it("이미지 클릭 시 라이트박스가 표시됨", async () => {
    const { user } = render(
      <PortfolioGallery portfolios={mockPortfolios as never[]} />
    );
    await user.click(screen.getAllByRole("button")[0]);
    expect(screen.getByTestId("lightbox")).toBeInTheDocument();
  });

  it("포트폴리오가 비어있으면 버튼이 없음", () => {
    render(<PortfolioGallery portfolios={[]} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("라이트박스 닫기 시 selectedIndex가 null로 됨", async () => {
    const { user } = render(
      <PortfolioGallery portfolios={mockPortfolios as never[]} />
    );
    await user.click(screen.getAllByRole("button")[0]);
    expect(screen.getByTestId("lightbox")).toBeInTheDocument();
    await user.click(screen.getByTestId("lightbox-close"));
    expect(screen.queryByTestId("lightbox")).not.toBeInTheDocument();
  });

  it("다음 버튼 클릭 시 인덱스 증가", async () => {
    const { user } = render(
      <PortfolioGallery portfolios={mockPortfolios as never[]} />
    );
    await user.click(screen.getAllByRole("button")[0]);
    expect(screen.getByTestId(LIGHTBOX_INDEX_ID).textContent).toBe("0");
    await user.click(screen.getByTestId("lightbox-next"));
    expect(screen.getByTestId(LIGHTBOX_INDEX_ID).textContent).toBe("1");
  });

  it("이전 버튼 클릭 시 마지막 인덱스로 순환", async () => {
    const { user } = render(
      <PortfolioGallery portfolios={mockPortfolios as never[]} />
    );
    await user.click(screen.getAllByRole("button")[0]);
    await user.click(screen.getByTestId("lightbox-prev"));
    expect(screen.getByTestId(LIGHTBOX_INDEX_ID).textContent).toBe("2");
  });

  it("중간 이미지에서 이전 버튼 클릭 시 인덱스 감소", async () => {
    const { user } = render(
      <PortfolioGallery portfolios={mockPortfolios as never[]} />
    );
    await user.click(screen.getAllByRole("button")[1]);
    expect(screen.getByTestId(LIGHTBOX_INDEX_ID).textContent).toBe("1");
    await user.click(screen.getByTestId("lightbox-prev"));
    expect(screen.getByTestId(LIGHTBOX_INDEX_ID).textContent).toBe("0");
  });

  it("마지막 이미지에서 다음 버튼 클릭 시 첫 인덱스로 순환", async () => {
    const { user } = render(
      <PortfolioGallery portfolios={mockPortfolios as never[]} />
    );
    await user.click(screen.getAllByRole("button")[2]);
    expect(screen.getByTestId(LIGHTBOX_INDEX_ID).textContent).toBe("2");
    await user.click(screen.getByTestId("lightbox-next"));
    expect(screen.getByTestId(LIGHTBOX_INDEX_ID).textContent).toBe("0");
  });
});
