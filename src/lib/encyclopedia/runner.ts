import "server-only";
import { revalidateTag } from "next/cache";
import { ENCYCLOPEDIA_TOPICS, type EncyclopediaTopic } from "./topics";
import {
  fetchPublishedTopicIds,
  insertEncyclopediaArticle,
} from "./queries";
import { generateEncyclopediaArticle, buildSlug } from "./generator";
import { notifySearchEngines } from "@/lib/utils/search-notify";

export type RunResult =
  | { ok: true; topic_id: number; slug: string; title: string; remaining: number }
  | { ok: false; topic_id?: number; error: string }
  | { ok: true; done: true; message: string };

/**
 * 한 번 실행에서 생성 시도에 쓸 시간 예산(ms).
 *
 * 예전에는 "첫 번째 미발행 토픽" 하나만 시도했다. 그 토픽이 영구적으로 실패하면
 * (34번 "유두 반영구 재건 시술" — 이미지/본문 생성이 콘텐츠 정책에 걸린다) 매일 같은 토픽을
 * 집어들고 같은 자리에서 넘어져 **큐 전체가 막힌다.** 실제로 2026-06-13 이후 62일간
 * 33/100 에서 멈춰 신규 백과 글이 0개였다.
 *
 * 그래서 성공할 때까지 다음 토픽으로 넘어간다. "앞의 N개만 시도" 로 상한을 두면 독성 토픽이
 * N개 쌓이는 순간 같은 교착이 재발하므로, 상한은 개수가 아니라 **시간**으로 잡는다.
 * 라우트 maxDuration=300s 보다 넉넉히 낮춰 루프 도중 강제 종료(부분 상태 + 로그 유실)를 피한다.
 */
const GENERATION_BUDGET_MS = 240_000;

async function pickTopicCandidates(
  overrideId: number | null,
): Promise<{ candidates: EncyclopediaTopic[]; publishedSize: number }> {
  const published = await fetchPublishedTopicIds();
  const candidates = overrideId !== null
    ? ENCYCLOPEDIA_TOPICS.filter((t) => t.id === overrideId)
    : ENCYCLOPEDIA_TOPICS.filter((t) => !published.has(t.id));
  return { candidates, publishedSize: published.size };
}

async function generateAndStore(
  topic: EncyclopediaTopic,
): Promise<{ ok: true; slug: string; title: string } | { ok: false; error: string }> {
  const article = await generateEncyclopediaArticle(topic);
  const slug = buildSlug(topic, article.title);

  const result = await insertEncyclopediaArticle({
    topic_id: topic.id,
    slug,
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    meta_title: article.meta_title,
    meta_description: article.meta_description,
    keywords: article.keywords,
    tags: article.tags,
    category: topic.category,
    cover_image_url: article.images[0]?.url ?? null,
    cover_image_alt: article.images[0]?.alt ?? null,
    inline_images: article.images,
    faq: article.faq,
    reading_time_minutes: article.reading_time_minutes,
    published: true,
  });

  if ("error" in result) return { ok: false, error: result.error };
  return { ok: true, slug, title: article.title };
}

export async function runEncyclopediaGeneration(
  overrideId: number | null,
): Promise<RunResult> {
  const { candidates, publishedSize } = await pickTopicCandidates(overrideId);

  if (candidates.length === 0) {
    return {
      ok: true,
      done: true,
      message: `All ${ENCYCLOPEDIA_TOPICS.length} topics already published`,
    };
  }

  const failures: string[] = [];
  const startedAt = Date.now();
  for (const topic of candidates) {
    if (failures.length > 0 && Date.now() - startedAt > GENERATION_BUDGET_MS) {
      failures.push("budget exhausted — 다음 실행에서 이어서 시도한다");
      break;
    }
    try {
      const result = await generateAndStore(topic);
      if (!result.ok) {
        failures.push(`#${String(topic.id)} ${topic.title}: ${result.error}`);
        continue;
      }
      revalidateTag("encyclopedia", { expire: 0 });
      notifySearchEngines([
        `/encyclopedia/${result.slug}`,
        "/encyclopedia",
        "/community?tab=beautylab",
      ]);
      return {
        ok: true,
        topic_id: topic.id,
        slug: result.slug,
        title: result.title,
        remaining: Math.max(0, ENCYCLOPEDIA_TOPICS.length - publishedSize - (overrideId !== null ? 0 : 1)),
      };
    } catch (e: unknown) {
      failures.push(`#${String(topic.id)} ${topic.title}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 후보를 전부 실패 — 어느 토픽에서 어떻게 실패했는지 전부 남긴다(로그만 보고 원인을 찾을 수 있게).
  return { ok: false, topic_id: candidates[0].id, error: failures.join(" | ") };
}
