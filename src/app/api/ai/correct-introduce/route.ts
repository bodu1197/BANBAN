import "server-only";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getUser } from "@/lib/supabase/auth";

export const maxDuration = 60;

// 맞춤법 교정은 단순 작업 — mini 모델로 비용 절감.
const MODEL = "gpt-4.1-mini";

const SYSTEM_PROMPT = [
  "당신은 한국어 맞춤법 교정기입니다.",
  "입력된 각 텍스트의 **맞춤법·띄어쓰기·문장부호만** 교정합니다.",
  "",
  "## 절대 준수",
  "1. 내용 추가·삭제·요약·윤색·표현 변경 절대 금지. 의미와 어순을 그대로 유지.",
  "2. 새 문장/단어를 만들지 마세요. 오직 틀린 맞춤법·띄어쓰기·문장부호만 고칩니다.",
  "3. 이미 올바른 텍스트는 입력 그대로 반환.",
  "4. 한국어 전용.",
  "5. valid JSON 만 출력. 입력과 **같은 id, 같은 개수**의 항목 반환.",
  "",
  "## 출력 형식",
  '{ "items": [ { "id": "<입력 id 그대로>", "text": "<교정된 텍스트>" }, ... ] }',
].join("\n");

interface CorrectItem {
  id: string;
  text: string;
}

const MAX_ITEMS = 20;
const MAX_TOTAL_LEN = 8000;

function sanitizeItems(raw: unknown): CorrectItem[] {
  const items = Array.isArray((raw as { items?: unknown })?.items) ? (raw as { items: unknown[] }).items : [];
  const result: CorrectItem[] = [];
  for (const it of items) {
    if (it && typeof it === "object") {
      const o = it as Record<string, unknown>;
      if (typeof o.id === "string" && typeof o.text === "string" && o.text.trim().length > 0) {
        result.push({ id: o.id, text: o.text });
      }
    }
  }
  return result;
}

async function correctViaAI(apiKey: string, items: CorrectItem[]): Promise<Map<string, string>> {
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 4000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `다음 텍스트들의 맞춤법·띄어쓰기·문장부호만 교정해 JSON 으로 반환하세요.\n${JSON.stringify({ items }, null, 2)}` },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  const byId = new Map<string, string>();
  if (content) {
    try {
      const parsed = sanitizeItems(JSON.parse(content));
      for (const it of parsed) byId.set(it.id, it.text);
    } catch {
      /* 잘못된 AI JSON — 빈 맵 반환(원문 유지, 500 방지) */
    }
  }
  return byId;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

    const user = await getUser();
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

    const items = sanitizeItems(await request.json());
    if (items.length === 0) return NextResponse.json({ items: [] });
    if (items.length > MAX_ITEMS) return NextResponse.json({ error: "항목이 너무 많습니다" }, { status: 400 });
    const totalLen = items.reduce((sum, it) => sum + it.text.length, 0);
    if (totalLen > MAX_TOTAL_LEN) return NextResponse.json({ error: "텍스트가 너무 깁니다" }, { status: 400 });

    const byId = await correctViaAI(apiKey, items);

    // 창작 방지 가드: 교정 결과가 원본 길이의 0.5~2배를 벗어나면 원본 유지(과교정/창작 차단).
    const result = items.map((it) => {
      const corrected = byId.get(it.id);
      if (typeof corrected !== "string" || corrected.length < it.text.length * 0.5 || corrected.length > it.text.length * 2) {
        return { id: it.id, text: it.text };
      }
      return { id: it.id, text: corrected };
    });

    return NextResponse.json({ items: result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "맞춤법 교정 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
