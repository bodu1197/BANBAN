import { describe, it, expect } from "vitest";
import { sanitizeNext } from "@/lib/auth/next-path";

/**
 * 로그인 후 복귀 경로는 오픈 리다이렉트 관문이다.
 * "/" 로 시작하는지만 보면 뚫린다 — 브라우저가 URL 을 읽기 전에 역슬래시를 "/" 로
 * 바꾸고 제어문자를 지우기 때문에, 여기서 같은 정규화를 먼저 해야 한다.
 */
describe("sanitizeNext", () => {
  it("내부 경로는 그대로 통과시킨다", () => {
    expect(sanitizeNext("/community/write")).toBe("/community/write");
    expect(sanitizeNext("/community?tab=reviews")).toBe("/community?tab=reviews");
  });

  it("값이 없으면 홈으로", () => {
    for (const empty of [null, undefined, ""]) {
      expect(sanitizeNext(empty)).toBe("/");
    }
  });

  it.each([
    ["프로토콜 상대", "//evil.com"],
    ["역슬래시", "/\evil.com"],
    ["역슬래시 2개", "/\\evil.com"],
    ["TAB 삽입", "/\t/evil.com"],
    ["개행 삽입", "/\r\n//evil.com"],
    ["절대 URL", "https://evil.com"],
    ["javascript 스킴", "javascript:alert(1)"],
  ])("외부로 나가는 %s 는 홈으로 깎는다", (_label, attack) => {
    const safe = sanitizeNext(attack);
    // 최종 판정은 브라우저와 같은 WHATWG 파서로 — 문자열 비교만으로는 우회를 놓친다.
    expect(new URL(safe, "https://banunni.com").origin).toBe("https://banunni.com");
  });
});
