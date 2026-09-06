import "server-only";
import { createStaticClient } from "@/lib/supabase/server";
import eyebrow from "@/content/guides/eyebrow.json";
import lip from "@/content/guides/lip.json";
import eyeliner from "@/content/guides/eyeliner.json";
import hairline from "@/content/guides/hairline.json";
import mensEyebrow from "@/content/guides/mens-eyebrow.json";
import smp from "@/content/guides/smp.json";

/**
 * 시술별 허브 페이지(/guide/<slug>) — "눈썹 반영구" 같은 큰 검색어를 한 페이지가 통째로 받는다.
 * 본문은 `src/content/guides/<slug>.json`(편집 자료, DB 아님). 6편은 고정 목록이라 빌드 때 전부 굽는다.
 * 🔴 파일은 **정적 import** 로 묶는다 — `readFileSync(process.cwd()+…)` 는 Vercel 의 파일 트레이싱이 못 잡아
 *    ISR 재렌더(1시간 뒤) 때 람다에 파일이 없어 404 가 된다(리뷰 2026-09-07). 폰트에 같은 사고가 있었다.
 * 🔒 금액 숫자·지어낸 통계·의료적 단정은 본문에 넣지 않는다(작성 지시서 규칙). 가격은 목록 페이지가 보여 준다.
 */
export interface GuideSection {
  readonly heading: string;
  readonly paragraphs: ReadonlyArray<string>;
}
export interface Guide {
  readonly slug: string;
  readonly title: string;
  readonly h1: string;
  readonly description: string;
  readonly intro: ReadonlyArray<string>;
  readonly sections: ReadonlyArray<GuideSection>;
  readonly checklist: ReadonlyArray<string>;
  readonly faq: ReadonlyArray<{ q: string; a: string }>;
  readonly keywords: ReadonlyArray<string>;
  /** 이 시술의 작품 목록 페이지 — 가격은 여기서 본다. */
  readonly listingPath: string;
}

/** 순서 = 홈·푸터에 보이는 순서. 슬러그는 URL 이라 바꾸면 색인이 깨진다. */
export const GUIDES: ReadonlyArray<{ slug: string; label: string }> = [
  { slug: "eyebrow", label: "눈썹 반영구" },
  { slug: "lip", label: "입술 반영구" },
  { slug: "eyeliner", label: "아이라인 반영구" },
  { slug: "hairline", label: "헤어라인 반영구" },
  { slug: "mens-eyebrow", label: "남자 눈썹 반영구" },
  { slug: "smp", label: "두피문신" },
];

const GUIDE_BY_SLUG: ReadonlyMap<string, Guide> = new Map<string, Guide>([
  ["eyebrow", eyebrow as Guide],
  ["lip", lip as Guide],
  ["eyeliner", eyeliner as Guide],
  ["hairline", hairline as Guide],
  ["mens-eyebrow", mensEyebrow as Guide],
  ["smp", smp as Guide],
]);

export function guideSlugs(): string[] {
  return GUIDES.map((g) => g.slug);
}

export function guideLabel(slug: string): string {
  return GUIDES.find((g) => g.slug === slug)?.label ?? slug;
}

export function loadGuide(slug: string): Guide | null {
  return GUIDE_BY_SLUG.get(slug) ?? null;
}

export interface EncyclopediaLink {
  readonly slug: string;
  readonly title: string;
}

/** 최근 백과 글 — 홈·허브에서 내부 링크로 쓴다(사이트맵으로만 닿던 33편에 진입로를 만든다). */
export async function fetchRecentEncyclopediaLinks(limit = 8): Promise<EncyclopediaLink[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("encyclopedia_articles")
    .select("slug, title")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as EncyclopediaLink[];
}
