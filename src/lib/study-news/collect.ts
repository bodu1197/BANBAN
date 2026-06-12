// RSS 피드 수집 → 파싱 → 도메인 화이트리스트/관련성 필터 → 후보 생성. (서버 전용)
// 의존성 없이 정규식으로 RSS <item> 을 파싱한다(Google News·정책브리핑 모두 단순 RSS).
// 각 피드 fetch 는 try/catch 로 감싸 실패해도 전체 수집을 멈추지 않는다.
import "server-only";
import { createHash } from "node:crypto";
import { FEEDS, classifySource, isRelevant, type FeedSource, type Tier } from "./sources";

export interface Candidate {
  title: string;
  url: string; // "원문 보기" 링크(직접 URL 또는 Google News 리다이렉트)
  domain: string;
  sourceName: string;
  tier: Tier;
  snippet: string;
  publishedAt: string | null; // ISO
  urlHash: string;
  slug: string;
}

const UA = "Mozilla/5.0 (compatible; BanunniNewsBot/1.0; +https://banunni.com)";
const SNIPPET_MAX = 280; // 발췌 최대 길이
const FETCH_TIMEOUT_MS = 12000; // 피드 fetch 타임아웃
const MAX_XML_BYTES = 5_000_000; // 비정상 대형 피드 방어(파서 폭주 차단)

interface RawItem {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  desc: string;
  sourceUrl: string | null;
  sourceName: string | null;
}

const ENTITIES = new Map<string, string>([
  ["&amp;", "&"],
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&quot;", '"'],
  ["&#39;", "'"],
  ["&apos;", "'"],
  ["&nbsp;", " "],
]);

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&[a-z]+;|&#\d+;/gi, (m) => ENTITIES.get(m) ?? m);
}

function clean(raw: string | null): string {
  if (!raw) return "";
  let s = raw;
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"); // CDATA 해제
  s = s.replace(/<[^>]+>/g, " "); // 태그 제거
  s = decodeEntities(s);
  return s.replace(/\s+/g, " ").trim();
}

function getTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(block);
  return m ? m[1] : null;
}

function hostOf(u: string): string | null {
  try {
    return new URL(u).hostname;
  } catch {
    return null;
  }
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function toIso(pubDate: string): string | null {
  if (!pubDate) return null;
  const d = new Date(pubDate);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function makeSlug(iso: string | null, hash: string): string {
  const datePart = iso ? iso.slice(0, 10) : "undated";
  return `${datePart}-${hash.slice(0, 8)}`;
}

// 안정적 중복 키 정규화: 회차/키워드 피드가 달라도(같은 기사) 동일 해시가 되도록.
function normalizeForHash(s: string): string {
  return s.toLowerCase().replace(/[\s“”"'`’‘[\]()·…,.\-–—!?:;]/g, "");
}

/** "헤드라인 - 발행사" 형태에서 끝의 발행사 꼬리표 제거 */
function stripSuffix(title: string, suffix: string | null): string {
  if (suffix) {
    const tail = ` - ${suffix}`;
    if (title.endsWith(tail)) return title.slice(0, -tail.length).trim();
  }
  return title;
}

function parseItems(xml: string): RawItem[] {
  const items: RawItem[] = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    let sourceUrl: string | null = null;
    let sourceName: string | null = null;
    const src = /<source\b([^>]*)>([\s\S]*?)<\/source>/i.exec(block);
    if (src) {
      const urlAttr = /url\s*=\s*"([^"]+)"/i.exec(src[1]);
      sourceUrl = urlAttr ? urlAttr[1] : null;
      sourceName = clean(src[2]);
    }
    items.push({
      title: clean(getTag(block, "title")),
      link: clean(getTag(block, "link")),
      guid: clean(getTag(block, "guid")),
      pubDate: clean(getTag(block, "pubDate")),
      desc: clean(getTag(block, "description")),
      sourceUrl,
      sourceName,
    });
  }
  return items;
}

function toCandidate(raw: RawItem, feed: FeedSource): Candidate | null {
  // 신뢰 등급 판정용 도메인 결정
  let host: string | null;
  if (feed.kind === "google-news") {
    host = raw.sourceUrl ? hostOf(raw.sourceUrl) : null;
  } else {
    host = hostOf(raw.link) ?? feed.defaultDomain ?? null;
  }
  if (!host) return null;

  const info = classifySource(host);
  if (!info) return null; // 화이트리스트 밖 → 폐기(신뢰 강제)

  const title = stripSuffix(raw.title, feed.kind === "google-news" ? raw.sourceName : null);
  if (!title) return null;

  // 발췌: 설명에서 제목 중복 제거 후 축약
  let snippet = raw.desc.replace(title, "").replace(/\s+/g, " ").trim();
  if (snippet.length > SNIPPET_MAX) snippet = `${snippet.slice(0, SNIPPET_MAX)}…`;

  if (!isRelevant(title, snippet)) return null;

  const url = raw.link;
  if (!url) return null;
  const domain = host.toLowerCase().replace(/^www\./, "");
  // 중복 키: 출처 도메인 + 정규화 제목으로 해시(회차 간 재게시 방지).
  const urlHash = sha256(`${domain}::${normalizeForHash(title)}`);
  const publishedAt = toIso(raw.pubDate);

  return {
    title,
    url,
    domain,
    sourceName: info.name,
    tier: info.tier,
    snippet,
    publishedAt,
    urlHash,
    slug: makeSlug(publishedAt, urlHash),
  };
}

async function fetchFeed(feed: FeedSource): Promise<RawItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    if (xml.length > MAX_XML_BYTES) return []; // 대형 피드 폐기(방어)
    return parseItems(xml);
  } catch {
    return []; // 피드 실패는 비치명적
  }
}

/** 모든 피드에서 후보를 수집·필터·중복제거(최신순). */
export async function collectCandidates(): Promise<Candidate[]> {
  const results = await Promise.all(
    FEEDS.map(async (feed) => {
      const raws = await fetchFeed(feed);
      return raws.map((r) => toCandidate(r, feed)).filter((c): c is Candidate => c !== null);
    }),
  );

  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const list of results) {
    for (const c of list) {
      if (seen.has(c.urlHash)) continue;
      seen.add(c.urlHash);
      out.push(c);
    }
  }
  out.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  return out;
}
