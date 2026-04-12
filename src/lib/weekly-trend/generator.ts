import { callOpenAiJson } from "@/lib/cron-jobs/openai-helper";

export interface WeeklyTrendItem {
  portfolio_id: string;
  title: string;
  artist_name: string;
  image_url: string | null;
  likes: number;
  category: string | null;
}

export interface WeeklyTrendContext {
  week_start: string; // YYYY-MM-DD (Monday)
  week_end: string;
  items: WeeklyTrendItem[];
  total_likes: number;
  top_categories: string[]; // top 3
}

export interface GeneratedWeeklyTrend {
  title: string;
  intro: string;       // markdown
  meta_description: string;
}

interface RawAi {
  title?: string;
  meta_description?: string;
  introduction?: string;
  trends_analysis?: string;
  conclusion?: string;
}

function buildPrompt(ctx: WeeklyTrendContext): string {
  const itemSummary = ctx.items
    .slice(0, 12)
    .map((it, i) => `${i + 1}. ${it.title} — ${it.artist_name}${it.category ? ` (${it.category})` : ""} · ❤ ${it.likes}`)
    .join("\n");
  return [
    `당신은 한국 타투 매거진의 주간 큐레이션 에디터입니다.`,
    `${ctx.week_start} ~ ${ctx.week_end} 주간 인기 작품을 소개하는 한국어 큐레이션 글을 400~600자로 작성하세요.`,
    ``,
    `# 주간 데이터`,
    `- 총 좋아요: ${ctx.total_likes}`,
    `- 주요 카테고리: ${ctx.top_categories.join(", ") || "다양"}`,
    `- 인기 작품 TOP 12:`,
    itemSummary,
    ``,
    `# 작성 규칙`,
    `1. 한국어로만 작성. 외국어 절대 금지.`,
    `2. 이번 주 트렌드 키워드 1~2개를 추출해 분석.`,
    `3. 특정 아티스트 강력 추천 금지(자연스러운 언급 OK).`,
    `4. 짧은 문단(2~3문장).`,
    ``,
    `# 출력 형식 (반드시 valid JSON)`,
    `{`,
    `  "title": "${ctx.week_start} 주간 인기 타투 트렌드 (60자 이내)",`,
    `  "meta_description": "150자 이내 SEO 설명",`,
    `  "introduction": "이번 주 트렌드 도입 1문단",`,
    `  "trends_analysis": "트렌드 분석 2~3문단",`,
    `  "conclusion": "다음 주 기대 마무리 1문단"`,
    `}`,
  ].join("\n");
}

function buildIntro(raw: RawAi): string {
  const lines: string[] = [];
  if (raw.introduction) lines.push(raw.introduction.trim(), "");
  if (raw.trends_analysis) lines.push("## 이번 주 트렌드", "", raw.trends_analysis.trim(), "");
  if (raw.conclusion) lines.push("## 마치며", "", raw.conclusion.trim(), "");
  return lines.join("\n").trim();
}

export async function generateWeeklyTrend(
  ctx: WeeklyTrendContext,
): Promise<GeneratedWeeklyTrend> {
  const raw = await callOpenAiJson<RawAi>(buildPrompt(ctx));
  return {
    title: raw.title?.trim() || `${ctx.week_start} 주간 인기 타투`,
    intro: buildIntro(raw),
    meta_description: raw.meta_description?.trim() ?? "",
  };
}
