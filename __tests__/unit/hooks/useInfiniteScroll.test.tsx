import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

let observeCallback: (entries: Partial<IntersectionObserverEntry>[]) => void;
let mockObserve: ReturnType<typeof vi.fn>;
let mockDisconnect: ReturnType<typeof vi.fn>;

function TestComponent({
  onLoadMore,
  hasMore,
  isLoading,
}: {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}): React.ReactElement {
  const sentinelRef = useInfiniteScroll({ onLoadMore, hasMore, isLoading });
  return <div ref={sentinelRef} data-testid="sentinel" />;
}

function NoRefComponent({
  onLoadMore,
  hasMore,
  isLoading,
}: {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}): React.ReactElement {
  useInfiniteScroll({ onLoadMore, hasMore, isLoading });
  return <div data-testid="no-ref" />;
}

describe("useInfiniteScroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();
    (globalThis.IntersectionObserver as ReturnType<typeof vi.fn>).mockImplementation(
      function (
        this: unknown,
        callback: (entries: Partial<IntersectionObserverEntry>[]) => void,
      ) {
        observeCallback = callback;
        return {
          observe: mockObserve,
          unobserve: vi.fn(),
          disconnect: mockDisconnect,
        };
      }
    );
  });

  it("sentinel 요소를 렌더링함", () => {
    render(
      <TestComponent onLoadMore={vi.fn()} hasMore={true} isLoading={false} />
    );
    expect(screen.getByTestId("sentinel")).toBeInTheDocument();
  });

  it("마운트 시 IntersectionObserver를 생성함", () => {
    render(
      <TestComponent onLoadMore={vi.fn()} hasMore={true} isLoading={false} />
    );
    expect(globalThis.IntersectionObserver).toHaveBeenCalled();
    expect(mockObserve).toHaveBeenCalled();
  });

  it("교차 시 hasMore=true, isLoading=false이면 onLoadMore 호출", () => {
    const onLoadMore = vi.fn();
    render(
      <TestComponent onLoadMore={onLoadMore} hasMore={true} isLoading={false} />
    );

    act(() => {
      observeCallback([{ isIntersecting: true }]);
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("hasMore=false이면 onLoadMore를 호출하지 않음", () => {
    const onLoadMore = vi.fn();
    render(
      <TestComponent
        onLoadMore={onLoadMore}
        hasMore={false}
        isLoading={false}
      />
    );

    act(() => {
      observeCallback([{ isIntersecting: true }]);
    });
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("isLoading=true이면 onLoadMore를 호출하지 않음", () => {
    const onLoadMore = vi.fn();
    render(
      <TestComponent onLoadMore={onLoadMore} hasMore={true} isLoading={true} />
    );

    act(() => {
      observeCallback([{ isIntersecting: true }]);
    });
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("교차하지 않으면 onLoadMore를 호출하지 않음", () => {
    const onLoadMore = vi.fn();
    render(
      <TestComponent onLoadMore={onLoadMore} hasMore={true} isLoading={false} />
    );

    act(() => {
      observeCallback([{ isIntersecting: false }]);
    });
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("언마운트 시 observer를 disconnect함", () => {
    const { unmount } = render(
      <TestComponent onLoadMore={vi.fn()} hasMore={true} isLoading={false} />
    );

    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("sentinel ref가 없으면 observer를 생성하지 않음", () => {
    render(
      <NoRefComponent onLoadMore={vi.fn()} hasMore={true} isLoading={false} />
    );
    expect(mockObserve).not.toHaveBeenCalled();
  });
});
