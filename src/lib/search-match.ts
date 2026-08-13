/**
 * 통합 검색 매칭·랭킹 규칙 — 순수 모듈(서버 의존성 없음)이라 단위 테스트가 가능하다.
 *
 * 배경: 예전 /api/search 는 `portfolios.title ilike` 하나만 걸었다. 설명도 카테고리도 안 봐서
 * 홈 인기검색어 칩("눈썹", "남자 눈썹" …)을 눌러도 제목에 그 글자가 든 작품만 나왔다
 * (실측: "남자 눈썹" 7건, "자연눈썹" 58건 — 정작 눈썹 카테고리엔 300건 넘게 있었다).
 */

/**
 * 경로별 후보 수집 상한. 실제 최대 매칭(현재 카테고리 361건)에 여유를 둔 값이며, 이 위로는
 * 좋아요 상위만 랭킹 대상이 된다. 잘림이 결정적이도록 후보 쿼리는 id 2차 정렬을 함께 건다.
 */
export const SEARCH_CANDIDATE_CAP = 500;

/** 한 번에 가져올 작품 수 — 서버 기본 limit 과 클라이언트 페이지 크기의 단일 출처 */
export const SEARCH_PAGE_SIZE = 48;

/**
 * 검색어 최소 길이. 한국어는 1글자가 유의미한 시술명일 수 있어("펌" 46건, "눈" 293건) 막지 않는다.
 * 비용은 후보 상한(SEARCH_CANDIDATE_CAP)과 랭킹 결과 60초 캐시로 잡는다.
 */
export const MIN_QUERY_LENGTH = 1;

/** 검색어 최대 길이 — 그 이상은 ilike 패턴만 커지고 매칭에 기여하지 않는다 */
export const MAX_QUERY_LENGTH = 50;

/** 매칭 등급: 낮을수록 위. 제목 정확도 > 카테고리 > 설명에만 언급 */
export const SEARCH_RANK = { TITLE: 1, CATEGORY: 2, DESCRIPTION: 3 } as const;

export interface SearchCandidate {
    id: string;
    title: string;
    artistId: string;
    likes: number;
    /** 광고 슬롯 적격(활성 샵) 여부 — 휴면 샵은 목록엔 남지만 광고로 끌어올리지 않는다 */
    artistActive: boolean;
}

export interface RankedCandidate extends SearchCandidate {
    rank: number;
    /** 제목에 걸린 검색어 단어 수 — 같은 등급 안의 정렬 기준 */
    score: number;
}

/** 공백·대소문자 무시 정규화 — "남자 눈썹" 과 "남자눈썹" 을 같게 본다 */
function normalize(value: string): string {
    return value.toLowerCase().replace(/\s+/g, "");
}

/** 검색어를 2글자 이상 단어로 쪼갠다 — "남자 눈썹" → ["남자","눈썹"] */
function tokenize(query: string): string[] {
    return query.toLowerCase().split(/\s+/).map((t) => t.trim()).filter((t) => t.length >= 2);
}

/**
 * 같은 등급 안의 관련도 — 제목에 걸린 검색어 단어 수.
 * 넓게 잡는 대신(오너 결정) 등급 안에서 이걸로 줄을 세운다. 이게 없으면 "남자 눈썹" 1페이지의
 * 절반이 여자 눈썹으로 찬다(실측: 48개 중 15개). 카테고리로만 걸린 결과가 41칸을 채우는데
 * 그 안에는 좋아요 말고 관련도 개념이 없기 때문이다.
 */
function tokenScore(title: string, tokens: ReadonlyArray<string>): number {
    if (tokens.length === 0) return 0;
    const t = normalize(title);
    return tokens.reduce((n, token) => (t.includes(normalize(token)) ? n + 1 : n), 0);
}

/**
 * 검색어 ↔ 카테고리명 양방향 포함 매칭.
 *
 * 한쪽 방향(카테고리명이 검색어를 포함)만 보면 "남자 눈썹"·"자연눈썹"·"눈썹문신" 처럼
 * 카테고리명에 수식어가 붙은 검색어가 전부 0건이 된다. 반대 방향(검색어가 카테고리명을 포함)을
 * 같이 보면 손으로 관리하는 동의어 표 없이 그 셋이 모두 눈썹 카테고리로 이어진다.
 *
 * 넓게 잡는 쪽을 택했다(오너 결정 2026-08-14): 관련 없는 결과가 조금 섞이더라도 등급 정렬이
 * 제목 정확 매칭을 위로 올리므로, 아무것도 안 나오는 것보다 낫다.
 */
export function matchCategoryIds(
    query: string,
    categories: ReadonlyArray<{ id: string; name: string }>,
): string[] {
    const q = normalize(query);
    if (q.length === 0) return [];

    const named = categories.map((c) => ({ ...c, norm: normalize(c.name) })).filter((c) => c.norm.length > 0);
    // 정방향: 카테고리명이 검색어를 품는다 ("눈썹" → 눈썹/눈썹잔흔/속눈썹). 넓게 잡는 쪽(오너 결정).
    const forward = named.filter((c) => c.norm.includes(q));
    // 역방향: 검색어가 카테고리명을 품는다 ("남자 눈썹" → 눈썹).
    const reverse = named.filter((c) => q.includes(c.norm));

    // 역방향에서 더 짧은 이름은 버린다 — "속눈썹" 검색이 "눈썹"(⊂ 속눈썹)까지 끌어와
    // 속눈썹 찾는 사람에게 눈썹 문신을 쏟아내는 오염을 막는다. 정방향에는 적용하지 않는다.
    const maximalReverse = reverse.filter(
        (c) => !reverse.some((other) => other.norm !== c.norm && other.norm.includes(c.norm)),
    );

    return [...new Set([...forward, ...maximalReverse].map((c) => c.id))];
}

/**
 * 경로별 후보를 합쳐 등급을 매긴다. 같은 작품이 여러 경로로 잡히면 가장 높은 등급(작은 값)만 남는다.
 * 정렬: 등급 → 좋아요 내림차순 → id (동점 시 순서 고정 = 더보기로 페이지를 늘려도 순서가 안 흔들린다).
 */
export function rankSearchCandidates(
    query: string,
    sources: {
        title: ReadonlyArray<SearchCandidate>;
        category: ReadonlyArray<SearchCandidate>;
        description: ReadonlyArray<SearchCandidate>;
    },
): RankedCandidate[] {
    const tokens = tokenize(query);
    const best = new Map<string, RankedCandidate>();

    const put = (c: SearchCandidate, rank: number): void => {
        const prev = best.get(c.id);
        if (!prev || rank < prev.rank) best.set(c.id, { ...c, rank, score: tokenScore(c.title, tokens) });
    };

    for (const c of sources.title) put(c, SEARCH_RANK.TITLE);
    for (const c of sources.category) put(c, SEARCH_RANK.CATEGORY);
    for (const c of sources.description) put(c, SEARCH_RANK.DESCRIPTION);

    return [...best.values()].sort(
        (a, b) => a.rank - b.rank || b.score - a.score || b.likes - a.likes || a.id.localeCompare(b.id),
    );
}
