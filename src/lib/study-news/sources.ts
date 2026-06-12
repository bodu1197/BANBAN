// 문신사법·국가시험 뉴스 수집의 단일 진실 출처(이소모픽: node 의존 없음).
//  · 검색 키워드(Google News RSS)
//  · 신뢰 출처 도메인 화이트리스트(티어)  ← 신뢰성을 "도메인"으로 강제
//  · 공식(Tier1) 직접 피드
// 화이트리스트에 없는 도메인의 항목은 전부 폐기한다(블로그·카페·SNS·아그리게이터 차단).

export type Tier = 1 | 2;

export interface SourceInfo {
  tier: Tier;
  name: string;
}

// host 가 key 로 "끝나면" 매칭(서브도메인 허용: imnews.imbc.com → imbc.com).
export const SOURCE_ALLOWLIST: Record<string, SourceInfo> = {
  // ── Tier 1 · 정부·공공·1차 (자동 게시) ──
  "korea.kr": { tier: 1, name: "대한민국 정책브리핑" },
  "mohw.go.kr": { tier: 1, name: "보건복지부" },
  "kuksiwon.or.kr": { tier: 1, name: "한국보건의료인국가시험원" },
  "law.go.kr": { tier: 1, name: "국가법령정보센터" },
  "assembly.go.kr": { tier: 1, name: "국회" },
  "mfds.go.kr": { tier: 1, name: "식품의약품안전처" },
  "gov.kr": { tier: 1, name: "정부24" },

  // ── Tier 2 · 신뢰 언론 (검토 후 게시) ──
  "yna.co.kr": { tier: 2, name: "연합뉴스" },
  "yonhapnews.co.kr": { tier: 2, name: "연합뉴스" },
  "newsis.com": { tier: 2, name: "뉴시스" },
  "news1.kr": { tier: 2, name: "뉴스1" },
  "chosun.com": { tier: 2, name: "조선일보" },
  "donga.com": { tier: 2, name: "동아일보" },
  "joongang.co.kr": { tier: 2, name: "중앙일보" },
  "hani.co.kr": { tier: 2, name: "한겨레" },
  "khan.co.kr": { tier: 2, name: "경향신문" },
  "hankookilbo.com": { tier: 2, name: "한국일보" },
  "munhwa.com": { tier: 2, name: "문화일보" },
  "seoul.co.kr": { tier: 2, name: "서울신문" },
  "kmib.co.kr": { tier: 2, name: "국민일보" },
  "hankyung.com": { tier: 2, name: "한국경제" },
  "mk.co.kr": { tier: 2, name: "매일경제" },
  "mt.co.kr": { tier: 2, name: "머니투데이" },
  "sedaily.com": { tier: 2, name: "서울경제" },
  "edaily.co.kr": { tier: 2, name: "이데일리" },
  "kbs.co.kr": { tier: 2, name: "KBS" },
  "imbc.com": { tier: 2, name: "MBC" },
  "sbs.co.kr": { tier: 2, name: "SBS" },
  "ytn.co.kr": { tier: 2, name: "YTN" },
  "jtbc.co.kr": { tier: 2, name: "JTBC" },
  "sisajournal.com": { tier: 2, name: "시사저널" },
  "sisain.co.kr": { tier: 2, name: "시사IN" },
  "doctorsnews.co.kr": { tier: 2, name: "의협신문" },
  "docdocdoc.co.kr": { tier: 2, name: "청년의사" },
  "newsthevoice.com": { tier: 2, name: "청년의사 더보이스" },
  "medicaltimes.com": { tier: 2, name: "메디칼타임즈" },
  "medigatenews.com": { tier: 2, name: "메디게이트뉴스" },
  "medicaldaily.co.kr": { tier: 2, name: "의약일보" },
  "monews.co.kr": { tier: 2, name: "메디칼업저버" },
  "medifonews.com": { tier: 2, name: "메디포뉴스" },
  "dailymedi.com": { tier: 2, name: "데일리메디" },
  "medipana.com": { tier: 2, name: "메디파나뉴스" },
  "themedical.kr": { tier: 2, name: "더메디컬" },
  "k-health.com": { tier: 2, name: "헬스경향" },
  "kpanews.co.kr": { tier: 2, name: "약사공론" },
  "akomnews.com": { tier: 2, name: "한의신문" },
  "lawtimes.co.kr": { tier: 2, name: "법률신문" },
};

/** host 를 화이트리스트와 대조해 신뢰등급 반환. 없으면 null(폐기). */
export function classifySource(host: string): SourceInfo | null {
  const h = host.toLowerCase().replace(/^www\./, "");
  for (const [domain, info] of Object.entries(SOURCE_ALLOWLIST)) {
    if (h === domain || h.endsWith(`.${domain}`)) return info;
  }
  return null;
}

// ── 검색 키워드 (하루 2회 폴링) ──
export const SEARCH_KEYWORDS = [
  "문신사법",
  "문신사 국가시험",
  "문신사 자격",
  "문신 합법화",
  "비의료인 문신",
  "타투이스트 자격",
];

function googleNews(q: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`;
}

export interface FeedSource {
  url: string;
  kind: "google-news" | "gov-rss";
  defaultName?: string; // gov-rss 는 <source> 가 없어 도메인/이름을 링크에서 추출
  defaultDomain?: string;
}

export const FEEDS: FeedSource[] = [
  ...SEARCH_KEYWORDS.map((q): FeedSource => ({ url: googleNews(q), kind: "google-news" })),
  // 공식 Tier1 직접 피드 — best-effort. 실패해도 수집은 계속(비치명적).
  { url: "https://www.korea.kr/rss/dept_mw.xml", kind: "gov-rss", defaultName: "보건복지부", defaultDomain: "korea.kr" },
  { url: "https://www.korea.kr/rss/pressrelease.xml", kind: "gov-rss", defaultName: "대한민국 정책브리핑", defaultDomain: "korea.kr" },
];

// ── 관련성 필터 (제목+발췌) ──
const SUBJECT_RE = /(문신|타투)/;
const CONTEXT_RE = /(법|시험|자격|면허|합법|국가|국시원|시술|위생|경과|시행|제도|복지부|보건)/;
const NEGATIVE_RE = /(제거|지우|커버업\s*이벤트|할인\s*이벤트|이벤트\s*가격)/;

export function isRelevant(title: string, snippet: string): boolean {
  const t = `${title} ${snippet}`;
  if (!SUBJECT_RE.test(t)) return false;
  if (!CONTEXT_RE.test(t)) return false;
  if (NEGATIVE_RE.test(title)) return false;
  return true;
}

export const CATEGORIES = ["법령", "시험일정", "제도/정책", "판례", "업계/현장", "기타"] as const;
export type Category = (typeof CATEGORIES)[number];
