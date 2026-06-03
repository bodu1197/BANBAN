import { unstable_cache } from "next/cache";
import { getActiveAdArtists } from "./ad-queries";
import type { HomePortfolio } from "./portfolio-common";
import { secureRandomInt, secureShuffle } from "@/lib/random";

/** 광고 주입 시 "같은 스코프"로 가져올 광고 포폴 최대 개수 (홈/검색 공통).
 *  광고주 수 무제한 → 풀에 윈도우 광고주의 포폴이 모두 포함되도록 넉넉히(60). injectAdPortfolios
 *  가 광고주당 1개만 추려 주입하므로 과다 노출은 없음. */
export const AD_INJECTION_FETCH_LIMIT = 60;

/** 한 캐시 세대(60s)에 한 섹션에 노출할 광고주 최대 수. 광고주가 이보다 많으면 세대마다
 *  무작위로 회전(rotation)해 결국 전원이 차례로 상단 노출 — 먼저 낸 광고도 영구 제외되지 않음.
 *  광고주 ≤ 이 값이면 매 세대 전원 노출(순서만 공평하게 셔플). UX/노출량 조절 시 이 값만 바꾸면 됨.
 *  주의: window × (광고주당 카테고리 포폴 수) 가 AD_INJECTION_FETCH_LIMIT(60) 를 넘으면 페치에서
 *  일부 윈도우 광고주가 누락될 수 있음 → 12 로 두면 광고주당 ~5장까지 커버. 키우려면 페치 한도도 함께. */
export const AD_ROTATION_WINDOW = 12;

/** Cached active ad artist IDs (60s TTL) — 노출 집계(impressions)·추천 reorder 용 */
export const fetchBoostArtistIds = unstable_cache(
  async (): Promise<string[]> => {
    const ads = await getActiveAdArtists();
    return ads.map((a) => a.artist_id);
  },
  ["boost-artist-ids"],
  { revalidate: 60, tags: ["ads"] },
);

export interface AdBoostContext {
  /** 현재 활성 광고 회원 아티스트 ID — 각 목록 쿼리에 .in("artist_id", …) 로 결합 */
  adArtistIds: string[];
  /** 광고주가 선택한 슬롯(대표작) 포폴 ID — 주입 시 우선 노출 */
  slotIds: string[];
}

/**
 * 활성 광고 컨텍스트(회원 ID + 슬롯 ID). unstable_cache 로 60s 메모이즈해
 * 한 렌더에서 여러 섹션이 호출해도 DB 1회. (Set 은 직렬화 불가 → 배열로 보관)
 */
export const getAdBoostContext = unstable_cache(
  async (): Promise<AdBoostContext> => {
    const ads = await getActiveAdArtists();
    // 매 캐시 세대(60s)마다 무작위 셔플 후 윈도우만큼만 노출 → 광고주가 많아도 세대마다 회전하여
    // 전원이 차례로 상단 노출(먼저 낸 광고도 제외 안 됨). 광고주 ≤ 윈도우면 매번 전원 노출.
    const rotated = secureShuffle(ads).slice(0, AD_ROTATION_WINDOW);
    return {
      adArtistIds: rotated.map((a) => a.artist_id),
      slotIds: rotated.flatMap((a) => a.portfolio_ids),
    };
  },
  ["ad-boost-context"],
  { revalidate: 60, tags: ["ads"] },
);

/**
 * 광고 회원 포폴을 목록 최상단에 "주입"한다 — 단순 재정렬이 아니라,
 * 호출부가 "같은 스코프"로 따로 fetch 해 온 광고 포폴(adPortfolios)을 끼워넣는다.
 * 자연 목록에 광고 회원이 원래 없어도 노출이 보장된다(부여 광고가 항상 보이게).
 *
 * - slotIds(광고주 선택 대표작) 우선 → 그 외 포폴
 * - 아티스트당 최대 1개(한 광고주가 슬롯 독식 방지). maxBoost 는 withAdInjection 이 활성 광고주 수로
 *   넘겨 전원 노출(고정 상한 없음). 직접 호출 시 기본값 2.
 * - 위치는 목록 맨 앞(0번부터) 고정 — 광고주가 구매한 "상단 노출/상단 고정" 가치 보장
 * - 이미 자연 목록에 포함된 포폴은 중복 제거 후 최상단으로 끌어올림
 *
 * 주의: 주입은 "추가"라서 반환 길이가 natural 보다 최대 maxBoost 만큼 늘 수 있다(대체 아님).
 * 소비 컴포넌트는 고정 개수를 가정하지 말 것(그리드/리스트는 가변 개수 허용).
 */
export function injectAdPortfolios(
  natural: HomePortfolio[],
  adPortfolios: HomePortfolio[],
  slotIds: readonly string[],
  maxBoost = 2,
): HomePortfolio[] {
  if (adPortfolios.length === 0) return natural;

  const slotSet = new Set(slotIds);
  // 슬롯(광고주 대표작)을 앞으로 — 슬롯이면 1, 아니면 0 으로 내림차순
  const ordered = [...adPortfolios].sort(
    (a, b) => (slotSet.has(b.id) ? 1 : 0) - (slotSet.has(a.id) ? 1 : 0),
  );

  const picked: HomePortfolio[] = [];
  const usedArtists = new Set<string>();
  for (const p of ordered) {
    if (usedArtists.has(p.artistId)) continue;
    usedArtists.add(p.artistId);
    picked.push(p);
    if (picked.length >= maxBoost) break;
  }

  const pickedIds = new Set(picked.map((p) => p.id));
  const rest = natural.filter((p) => !pickedIds.has(p.id));
  // 광고는 목록 맨 앞(0번부터)에 고정 — 0~2 랜덤이면 2~3번째로 밀려 "상단에 광고가 없다"는
  // 피드백이 있었음(검색 캐시 세대마다 위치가 달라짐). 구매한 "상단 노출" 가치를 명확히 보장.
  return [...picked, ...rest];
}

/**
 * 목록에 광고 주입을 적용하는 오케스트레이터.
 * fetchAds: 해당 목록과 "같은 스코프"로 광고 회원 포폴만 가져오는 호출부 클로저
 *   (자기 쿼리에 .in("artist_id", adArtistIds) 만 더해 전달 — 카테고리/할인/지역 등 스코프 정확히 일치).
 * 광고가 없으면 자연 목록 그대로 반환(추가 쿼리 0).
 */
export async function withAdInjection(
  natural: HomePortfolio[],
  fetchAds: (adArtistIds: string[]) => Promise<HomePortfolio[]>,
): Promise<HomePortfolio[]> {
  const { adArtistIds, slotIds } = await getAdBoostContext();
  if (adArtistIds.length === 0) return natural;
  const adPortfolios = await fetchAds(adArtistIds);
  // 광고주 수는 무제한 → 고정 캡(2) 없이 활성 광고주 전원(광고주당 1개씩) 주입해 모두 노출 보장.
  return injectAdPortfolios(natural, adPortfolios, slotIds, adArtistIds.length);
}

/**
 * 추천 위젯(포폴 상세) 전용 reorder — 이미 가져온 목록 안에서 광고 회원을 위로.
 * 추천은 "현재 포폴과 유사" 맥락이라 무관 포폴 주입 대신 reorder 유지.
 */
export function applyBoostGeneric<T>(
  items: T[],
  boostIds: Set<string>,
  getArtistId: (item: T) => string,
  maxBoost = 2,
): T[] {
  if (items.length === 0 || boostIds.size === 0) return items;

  const boosted: T[] = [];
  const rest: T[] = [];

  for (const p of items) {
    if (boostIds.has(getArtistId(p)) && boosted.length < maxBoost) {
      boosted.push(p);
    } else {
      rest.push(p);
    }
  }

  if (boosted.length === 0) return items;

  const result = [...rest];
  for (const item of boosted) {
    const pos = secureRandomInt(Math.min(3, result.length + 1));
    result.splice(pos, 0, item);
  }

  return result;
}
