import { describe, it, expect } from "vitest";
import { addressToRegionKey } from "@/lib/regions";

// 다음(Daum) 주소검색이 내려주는 실제 표기를 regions.name 키로 바꾸는 로직.
// 여기가 어긋나면 샵 등록이 "'지역'을 찾지 못했습니다" 에서 막힌다.
describe("addressToRegionKey", () => {
  it("일반구가 있는 시는 구까지 포함한다", () => {
    expect(addressToRegionKey("경기 용인시 수지구 현암로 148")).toBe("경기 용인시 수지구");
    expect(addressToRegionKey("경남 창원시 마산합포구 3·15대로 1")).toBe("경남 창원시 마산합포구");
  });

  it("일반구가 없는 시·군은 시군구까지만", () => {
    expect(addressToRegionKey("경기 김포시 김포한강1로 100")).toBe("경기 김포시");
    expect(addressToRegionKey("경기 가평군 가평읍 석봉로 181")).toBe("경기 가평군");
  });

  it("광역시 구는 그대로", () => {
    expect(addressToRegionKey("서울 강남구 테헤란로 152")).toBe("서울 강남구");
  });

  it("시도 전체 표기(다음 구형/신형)도 짧은 이름으로 바꾼다", () => {
    expect(addressToRegionKey("경기도 김포시 김포한강1로 100")).toBe("경기 김포시");
    expect(addressToRegionKey("강원특별자치도 춘천시 중앙로 1")).toBe("강원 춘천시");
    expect(addressToRegionKey("전북특별자치도 전주시 완산구 효자로 225")).toBe("전북 전주시 완산구");
  });

  it("세종은 시군구가 없어 도로명이 두 번째로 와도 고정 매칭한다", () => {
    expect(addressToRegionKey("세종특별자치시 한누리대로 2130")).toBe("세종 세종시");
    expect(addressToRegionKey("세종 도움5로 20")).toBe("세종 세종시");
  });

  it("시도를 모르면 null", () => {
    expect(addressToRegionKey("Tokyo Shibuya 1-1")).toBeNull();
    expect(addressToRegionKey("서울")).toBeNull();
  });

  it("앞뒤 공백·중복 공백에도 흔들리지 않는다", () => {
    expect(addressToRegionKey("  서울 강남구 테헤란로 152 ")).toBe("서울 강남구");
    expect(addressToRegionKey("경기  용인시  수지구 현암로 148")).toBe("경기 용인시 수지구");
    expect(addressToRegionKey("")).toBeNull();
    expect(addressToRegionKey("   ")).toBeNull();
  });
});
