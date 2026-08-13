import { describe, it, expect } from "vitest";
import { monthStartKST, todayStartKST } from "@/lib/utils/format";

describe("monthStartKST", () => {
    it("서버 로컬 타임존과 무관하게 KST 월초를 가리킨다 (UTC 서버에서 1일 00~09시가 빠지던 문제)", () => {
        const iso = monthStartKST();
        // KST 월초 = UTC 로 전달 말일 15:00 (또는 그 달 1일 00:00 이 아닌 시각)
        expect(iso).toMatch(/T15:00:00\.000Z$/);
    });

    it("KST 로 환산하면 그 달 1일 0시다", () => {
        const kst = new Date(monthStartKST()).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" });
        expect(kst).toMatch(/-01 00:00:00$/);
    });

    it("이번 달 시작은 지금보다 과거이고, 오늘 시작보다 늦지 않다", () => {
        const monthStart = new Date(monthStartKST()).getTime();
        expect(monthStart).toBeLessThanOrEqual(Date.now());
        expect(monthStart).toBeLessThanOrEqual(new Date(todayStartKST()).getTime());
    });
});
