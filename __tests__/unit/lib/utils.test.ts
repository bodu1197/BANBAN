import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (className 유틸리티)", () => {
  it("여러 클래스를 병합함", () => {
    const result = cn("text-sm", "font-bold");
    expect(result).toBe("text-sm font-bold");
  });

  it("falsy 값을 무시함", () => {
    const shouldHide = false;
    const result = cn("text-sm", shouldHide && "hidden", null, undefined, "p-4");
    expect(result).toBe("text-sm p-4");
  });

  it("조건부 클래스를 처리함", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base active");
  });

  it("충돌하는 Tailwind 클래스를 올바르게 병합함", () => {
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });

  it("빈 입력에 빈 문자열을 반환함", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("배열 형태 입력을 처리함", () => {
    const result = cn(["text-sm", "font-bold"]);
    expect(result).toBe("text-sm font-bold");
  });
});
