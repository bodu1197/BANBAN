// 뉴스 AI 요약(서버 전용). Structured Outputs(json_schema) 패턴.
// ⚠️ 환각 차단: 제공된 '제목/발췌'에 명시된 내용만 사용하도록 강하게 지시(temperature 0.2).
// 키 미설정/실패 시 null 반환 → 호출부가 원문 발췌로 폴백(AI 없이도 동작).
import "server-only";
import { CATEGORIES, type Category } from "./sources";

export interface NewsSummary {
  summary: string;
  category: Category;
  relevance: number;
}

const OPENAI_TIMEOUT_MS = 20000; // Vercel 함수 타임아웃 보호

function apiKey(): string | null {
  const k = (process.env.OPENAI_API_KEY || "").trim();
  if (!k || !k.startsWith("sk") || k.includes("your-")) return null;
  return k;
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    category: { type: "string", enum: [...CATEGORIES] },
    relevance: { type: "integer", enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  },
  required: ["summary", "category", "relevance"],
};

const SYSTEM = `당신은 한국 '문신사법·문신사 국가시험' 소식을 수험생에게 전달하는 뉴스 편집자다.
규칙:
- 제공된 '제목'과 '발췌'에 **명시된 내용만** 사용한다. 원문에 없는 날짜·수치·기관·사실을 절대 지어내지 마라.
- 정보가 부족하면 제목을 중립적으로 한 문장으로 풀어 쓰는 데 그쳐라(추측 금지).
- 2~3문장, 객관적·존댓말. 과장·논평·이모지 금지.
- category 는 보기 중 하나. relevance 는 문신사법/국가시험과의 관련도(1~10, 무관하면 낮게).`;

export async function summarizeNews(input: { title: string; snippet: string; sourceName: string }): Promise<NewsSummary | null> {
  const key = apiKey();
  if (!key) return null;
  const model = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();

  const user = `출처: ${input.sourceName}
제목: ${input.title}
발췌: ${input.snippet || "(발췌 없음 — 제목만 근거로 작성)"}

위 내용만 근거로 요약·분류하라.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
        response_format: { type: "json_schema", json_schema: { name: "news_summary", strict: true, schema: SCHEMA } },
      }),
      signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS), // Vercel 함수 타임아웃 보호
    });
    if (!res.ok) return null;
    const j = await res.json();
    const content = j?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as Partial<NewsSummary>;
    if (typeof parsed.summary !== "string" || !parsed.summary.trim()) return null;
    const category = (CATEGORIES as readonly string[]).includes(parsed.category as string) ? (parsed.category as Category) : "기타";
    const relevance =
      typeof parsed.relevance === "number" && parsed.relevance >= 1 && parsed.relevance <= 10 ? Math.round(parsed.relevance) : 5;
    return { summary: parsed.summary.trim(), category, relevance };
  } catch {
    return null; // AI 요약 실패(네트워크/파싱)는 비치명적 — 호출부가 원문 발췌로 폴백
  }
}
