import { describe, it, expect } from "vitest";
import { matchCategoryIds, rankSearchCandidates, SEARCH_RANK } from "@/lib/search-match";

const CATEGORIES = [
    { id: "brow", name: "눈썹" },
    { id: "brow-scar", name: "눈썹잔흔" },
    { id: "lash", name: "속눈썹" },
    { id: "lip", name: "입술" },
    { id: "hairline", name: "헤어라인" },
];

const cand = (id: string, title: string, likes = 0, artistId = `a-${id}`): {
    id: string; title: string; artistId: string; likes: number; artistActive: boolean;
} => ({ id, title, artistId, likes, artistActive: true });

describe("matchCategoryIds — 양방향 포함 매칭", () => {
    it("카테고리명이 검색어를 포함하면 매칭 (눈썹 → 눈썹/눈썹잔흔/속눈썹)", () => {
        expect(matchCategoryIds("눈썹", CATEGORIES)).toEqual(["brow", "brow-scar", "lash"]);
    });

    it("검색어가 카테고리명을 포함해도 매칭 — 이게 없으면 '남자 눈썹' 이 0건이 된다(실제 버그)", () => {
        expect(matchCategoryIds("남자 눈썹", CATEGORIES)).toEqual(["brow"]);
        expect(matchCategoryIds("자연눈썹", CATEGORIES)).toEqual(["brow"]);
        expect(matchCategoryIds("눈썹문신 잘하는곳", CATEGORIES)).toEqual(["brow"]);
    });

    it("공백은 무시한다 — '남자 눈썹' 과 '남자눈썹' 이 같아야 한다", () => {
        expect(matchCategoryIds("남자눈썹", CATEGORIES)).toEqual(matchCategoryIds("남자 눈썹", CATEGORIES));
    });

    it("역방향에서 더 짧은 이름은 버린다 — '속눈썹' 검색에 눈썹 문신이 쏟아지지 않게", () => {
        // "속눈썹" 은 눈썹(⊂ 속눈썹)도 역방향 매칭되지만, 더 긴 이름이 이겼으므로 눈썹은 빠진다
        expect(matchCategoryIds("속눈썹 연장", CATEGORIES)).toEqual(["lash"]);
    });

    it("이름이 같고 id 만 다른 카테고리는 전부 잡는다 (성별별로 같은 이름이 존재한다)", () => {
        const dup = [{ id: "brow-f", name: "눈썹" }, { id: "brow-m", name: "눈썹" }];
        expect(matchCategoryIds("남자 눈썹", dup)).toEqual(["brow-f", "brow-m"]);
    });

    it("영문 대소문자 무시 — 실제 카테고리에 '두피SMP' 가 있다", () => {
        const smp = [{ id: "smp", name: "두피SMP" }];
        expect(matchCategoryIds("두피smp", smp)).toEqual(["smp"]);
        expect(matchCategoryIds("두피SMP 잘하는곳", smp)).toEqual(["smp"]);
    });

    it("이어지지 않는 검색어는 빈 배열 (카테고리 필터 없음 = 텍스트 매칭만)", () => {
        expect(matchCategoryIds("리터치", CATEGORIES)).toEqual([]);
        expect(matchCategoryIds("", CATEGORIES)).toEqual([]);
        expect(matchCategoryIds("   ", CATEGORIES)).toEqual([]);
    });
});

describe("rankSearchCandidates — 정확도 우선 정렬", () => {
    it("제목 매칭 → 카테고리 → 설명에만 언급 순 (좋아요가 훨씬 많아도 등급이 이긴다)", () => {
        const ranked = rankSearchCandidates("눈썹", {
            title: [cand("t", "눈썹 반영구", 1)],
            category: [cand("c", "엠보 시술", 500)],
            description: [cand("d", "인기 시술", 999)],
        });
        expect(ranked.map((r) => r.id)).toEqual(["t", "c", "d"]);
        expect(ranked.map((r) => r.rank)).toEqual([SEARCH_RANK.TITLE, SEARCH_RANK.CATEGORY, SEARCH_RANK.DESCRIPTION]);
    });

    it("같은 등급 안에서는 좋아요 많은 순", () => {
        const ranked = rankSearchCandidates("눈썹", {
            title: [cand("low", "눈썹 A", 1), cand("high", "눈썹 B", 50)],
            category: [],
            description: [],
        });
        expect(ranked.map((r) => r.id)).toEqual(["high", "low"]);
    });

    it("여러 경로로 잡힌 작품은 한 번만, 가장 높은 등급으로", () => {
        const both = cand("x", "눈썹 반영구", 10);
        const ranked = rankSearchCandidates("눈썹", { title: [both], category: [both], description: [both] });
        expect(ranked).toHaveLength(1);
        expect(ranked[0].rank).toBe(SEARCH_RANK.TITLE);
    });

    it("좋아요까지 같으면 id 순 — 더보기로 페이지를 늘려도 순서가 흔들리지 않아야 한다", () => {
        const ranked = rankSearchCandidates("눈썹", {
            title: [cand("b", "눈썹", 5), cand("a", "눈썹", 5)], category: [], description: [],
        });
        expect(ranked.map((r) => r.id)).toEqual(["a", "b"]);
    });

    it("같은 등급 안에서는 검색어 단어가 더 많이 걸린 쪽이 먼저 — '남자 눈썹' 1페이지가 여자 눈썹으로 차던 문제", () => {
        const ranked = rankSearchCandidates("남자 눈썹", {
            title: [],
            category: [cand("f", "여자눈썹 자연", 99), cand("m", "남자눈썹 자연", 1)],
            description: [],
        });
        expect(ranked.map((r) => r.id)).toEqual(["m", "f"]);
    });

    it("한 글자 단어는 관련도 계산에서 무시 — 조사·잡음이 순서를 흔들지 않게", () => {
        const ranked = rankSearchCandidates("눈썹 A", {
            title: [cand("plain", "눈썹 반영구", 1)],
            category: [],
            description: [],
        });
        expect(ranked[0].score).toBe(1);
    });

    it("빈 결과는 빈 배열", () => {
        expect(rankSearchCandidates("눈썹", { title: [], category: [], description: [] })).toEqual([]);
    });
});
