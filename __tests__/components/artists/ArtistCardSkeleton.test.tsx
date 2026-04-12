import { describe, it, expect } from "vitest";
import { render } from "../../utils";
import { ArtistCardSkeleton } from "@/components/artists/ArtistCardSkeleton";

describe("ArtistCardSkeleton", () => {
  it("크래시 없이 렌더링됨", () => {
    const { container } = render(<ArtistCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("스켈레톤 요소들이 포함됨", () => {
    const { container } = render(<ArtistCardSkeleton />);
    // Skeleton 컴포넌트는 data-slot="skeleton" 속성 또는 특정 클래스를 가짐
    const skeletons = container.querySelectorAll("[data-slot='skeleton'], .animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
