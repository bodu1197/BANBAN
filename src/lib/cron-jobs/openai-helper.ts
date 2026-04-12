import OpenAI from "openai";

const MODEL = "gpt-4o-mini";

/**
 * Shared helper for cron-job content generators. Wraps the OpenAI chat
 * completion call with json_object response_format and a Korean-only system
 * prompt. Throws on missing API key, empty response, or invalid JSON.
 */
export async function callOpenAiJson<T>(userPrompt: string): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "당신은 한국 타투/반영구 메이크업 분야의 전문 에디터입니다. 반드시 한국어로만 작성하세요. 반드시 valid JSON만 반환하세요. 다른 텍스트는 절대 출력하지 마세요.",
      },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned empty response");

  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    throw new Error(`OpenAI returned invalid JSON: ${(e as Error).message}`);
  }
}
