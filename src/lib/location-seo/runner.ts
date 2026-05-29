import "server-only";
import { revalidatePath } from "next/cache";
import { LOCATION_TARGETS, targetKey, type LocationTarget } from "./targets";
import {
  fetchPublishedLocationKeys,
  resolveRegionByName,
  fetchRegionStats,
  insertLocationSeoPage,
} from "./generation-queries";
import { generateLocationPage, buildLocationSlug } from "./generator";

export type LocationRunResult =
  | { ok: true; target: string; slug: string; title: string; remaining: number }
  | { ok: false; target?: string; error: string }
  | { ok: true; done: true; message: string };

export async function pickNextTarget(
  override: string | null,
): Promise<{ target: LocationTarget | undefined; publishedSize: number }> {
  const published = await fetchPublishedLocationKeys();
  const target = override !== null
    ? LOCATION_TARGETS.find((t) => targetKey(t.region, t.style) === override)
    : LOCATION_TARGETS.find((t) => !published.has(targetKey(t.region, t.style)));
  return { target, publishedSize: published.size };
}

async function generateAndStore(
  target: LocationTarget,
): Promise<{ ok: true; slug: string; title: string } | { ok: false; error: string }> {
  const region = await resolveRegionByName(target.region);
  if (!region) return { ok: false, error: `region not found: ${target.region}` };

  const stats = await fetchRegionStats(region.id);
  // 활동 샵이 없는 지역은 thin/무의미 페이지가 되므로 발행하지 않음.
  if (stats.artistCount < 1) {
    return { ok: false, error: `no active shops in ${target.region}` };
  }
  const page = await generateLocationPage(target, stats);
  const slug = buildLocationSlug(target.region, target.style);

  const result = await insertLocationSeoPage({
    region_id: region.id,
    region_name: region.name,
    style: target.style,
    slug,
    title: page.title,
    excerpt: page.excerpt,
    content: page.content,
    meta_title: page.meta_title,
    meta_description: page.meta_description,
    keywords: page.keywords,
    cover_image_url: page.images[0]?.url ?? null,
    cover_image_alt: page.images[0]?.alt ?? null,
    inline_images: page.images,
    faq: page.faq,
    artist_count: stats.artistCount,
    portfolio_count: stats.portfolioCount,
    reading_time_minutes: page.reading_time_minutes,
    published: true,
  });

  if ("error" in result) return { ok: false, error: result.error };
  return { ok: true, slug, title: page.title };
}

export async function runLocationSeoGeneration(
  override: string | null,
): Promise<LocationRunResult> {
  const { target, publishedSize } = await pickNextTarget(override);

  if (!target) {
    return {
      ok: true,
      done: true,
      message: `All ${LOCATION_TARGETS.length} location targets already published`,
    };
  }

  const key = targetKey(target.region, target.style);
  try {
    const result = await generateAndStore(target);
    if (!result.ok) return { ok: false, target: key, error: result.error };
    revalidatePath("/location"); // 허브 목록 갱신(신규 상세는 ISR 온디맨드 생성)
    return {
      ok: true,
      target: key,
      slug: result.slug,
      title: result.title,
      remaining: LOCATION_TARGETS.length - publishedSize - (override !== null ? 0 : 1),
    };
  } catch (e: unknown) {
    return { ok: false, target: key, error: e instanceof Error ? e.message : String(e) };
  }
}
