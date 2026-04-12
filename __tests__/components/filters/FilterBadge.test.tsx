import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../utils";
import { FilterBadge } from "@/components/filters/FilterBadge";

describe("FilterBadge", () => {
  it("라벨 텍스트가 렌더링됨", () => {
    render(<FilterBadge label="서울" onRemove={vi.fn()} />);
    expect(screen.getByText("서울")).toBeInTheDocument();
  });

  it("클릭 시 onRemove 호출", async () => {
    const onRemove = vi.fn();
    const { user } = render(<FilterBadge label="서울" onRemove={onRemove} />);

    await user.click(screen.getByTestId("filter-badge"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("data-testid='filter-badge'가 있음", () => {
    render(<FilterBadge label="서울" onRemove={vi.fn()} />);
    expect(screen.getByTestId("filter-badge")).toBeInTheDocument();
  });
});
