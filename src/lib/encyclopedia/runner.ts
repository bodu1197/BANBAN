import { revalidateTag } from "next/cache";
import { ENCYCLOPEDIA_TOPICS, type EncyclopediaTopic } from "./topics";
import {
  fetchPublishedTopicIds,
  insertEncyclopediaArticle,
  pickRelatedPortfolioImages,
} from "./queries";
import { generateEncyclopediaArticle, buildSlug } from "./generator";

export type RunResult =
  | { ok: true; topic_id: number; slug: string; title: string; remaining: number }
  | { ok: false; topic_id?: number; error: string }
  | { ok: true; done: true; message: string };

export async function pickNextTopic(
  overrideId: number | null,
): Promise<{ topic: EncyclopediaTopic | undefined; publishedSize: number }> {
  const published = await fetchPublishedTopicIds();
  const topic = overrideId !== null
    ? ENCYCLOPEDIA_TOPICS.find((t) => t.id === overrideId)
    : ENCYCLOPEDIA_TOPICS.find((t) => !published.has(t.id));
  return { topic, publishedSize: published.size };
}

async function generateAndStore(
  topic: EncyclopediaTopic,
): Promise<{ ok: true; slug: string; title: string } | { ok: false; error: string }> {
  const article = await generateEncyclopediaArticle(topic);
  const images = await pickRelatedPortfolioImages(topic.keyword, 4);
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
    cover_image_url: images[0]?.url ?? null,
    cover_image_alt: images[0]?.alt ?? null,
    inline_images: images,
    faq: article.faq,
    reading_time_minutes: article.reading_time_minutes,
    published: true,
  });

  if ("error" in result) return { ok: false, error: result.error };
  return { ok: true, slug, title: article.title };
}

/**
 * Run one encyclopedia generation cycle. Shared between Vercel cron and
 * the admin dashboard manual trigger.
 */
export async function runEncyclopediaGeneration(
  overrideId: number | null,
): Promise<RunResult> {
  const { topic, publishedSize } = await pickNextTopic(overrideId);

  if (!topic) {
    return {
      ok: true,
      done: true,
      message: "All 365 topics already published",
    };
  }

  try {
    const result = await generateAndStore(topic);
    if (!result.ok) {
      return { ok: false, topic_id: topic.id, error: result.error };
    }
    revalidateTag("encyclopedia", { expire: 0 });
    return {
      ok: true,
      topic_id: topic.id,
      slug: result.slug,
      title: result.title,
      remaining: ENCYCLOPEDIA_TOPICS.length - publishedSize - (overrideId !== null ? 0 : 1),
    };
  } catch (e) {
    return { ok: false, topic_id: topic.id, error: (e as Error).message };
  }
}
