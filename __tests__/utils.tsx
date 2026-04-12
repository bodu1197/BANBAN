import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";

/**
 * 테스트용 래퍼 (필요시 Provider 추가)
 */
function TestWrapper({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  return <>{children}</>;
}

/**
 * 커스텀 render 함수
 * - userEvent 인스턴스 포함
 * - 래퍼 자동 적용
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
): ReturnType<typeof render> & { user: ReturnType<typeof userEvent.setup> } {
  const user = userEvent.setup();
  const renderResult = render(ui, { wrapper: TestWrapper, ...options });

  return {
    ...renderResult,
    user,
  };
}

// re-export everything
export * from "@testing-library/react";
export { customRender as render };
export { default as userEvent } from "@testing-library/user-event";

/**
 * 비동기 테스트 헬퍼
 */
export async function waitForLoadingToFinish(): Promise<void> {
  // loading 상태가 끝날 때까지 대기
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * 모킹된 아티스트 데이터
 */
export const mockArtist = {
  id: "test-artist-1",
  title: "테스트 아티스트",
  address: "서울 강남구",
  likes_count: 100,
  views_count: 500,
  instagram_url: "https://instagram.com/test",
  kakao_url: "https://kakao.com/test",
  introduce: "테스트 소개글입니다.",
  region: {
    id: "seoul",
    name: "서울",
  },
};

/**
 * 모킹된 포트폴리오 데이터
 */
export const mockPortfolio = {
  id: "test-portfolio-1",
  title: "테스트 포트폴리오",
  artist_id: "test-artist-1",
  portfolio_media: [
    {
      id: "media-1",
      storage_path: "/test-image-1.jpg",
      order_index: 0,
    },
    {
      id: "media-2",
      storage_path: "/test-image-2.jpg",
      order_index: 1,
    },
  ],
};
