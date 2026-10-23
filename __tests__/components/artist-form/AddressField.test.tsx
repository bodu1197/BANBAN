import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../utils";
import { AddressField, buildFormLabelsFromDict } from "@/components/artist-form/ArtistFormFields";
import { STRINGS } from "@/lib/strings";
import type { ArtistFormData } from "@/types/artist-form";

// 주소 아래 지역 안내 — 스크린리더가 결과를 읽으려면 알림 요소(role=status)가 처음부터 있고 글자만 바뀌어야 한다.
describe("AddressField 지역 안내", () => {
  const t = buildFormLabelsFromDict(STRINGS.artistRegister);

  function field(address: string, regionName: string | null, isRegionLoading = false): React.ReactElement {
    const formData = { zipcode: "", address, address_detail: "" } as ArtistFormData;
    return (
      <AddressField formData={formData} onSearch={vi.fn()} onChange={() => vi.fn()} t={t}
        regionName={regionName} isRegionLoading={isRegionLoading} />
    );
  }

  it("주소 없음 → 조회 중 → 찾음 → 못 찾음 내내 같은 알림 요소에서 글자만 바뀐다", () => {
    const { rerender } = render(field("", null));
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    rerender(field("전남광주통합특별시 광산구 가삼길 18", null, true));
    expect(status).toHaveTextContent("지역 확인 중…");

    rerender(field("전남광주통합특별시 광산구 가삼길 18", "광주 광산구"));
    expect(status).toHaveTextContent("지역: 광주 광산구");
    expect(status).not.toHaveClass("text-destructive");

    rerender(field("서울 어딘가", null));
    expect(status).toHaveTextContent("지역을 찾지 못했습니다");
    expect(status).toHaveClass("text-destructive");
    expect(screen.getByRole("status")).toBe(status);
  });
});
