import "server-only";
import { revalidatePath } from "next/cache";
import { buildLocationTargets, targetKey, type LocationTarget } from "./targets";
import {
  fetchPublishedLocationKeys,
  fetchRegionNamesWithActiveShops,
  resolveRegionByName,
  fetchRegionStats,
  insertLocationSeoPage,
} from "./generation-queries";
import { generateLocationPage, buildLocationSlug } from "./generator";
import { notifySearchEngines } from "@/lib/utils/search-notify";

export type LocationRunResult =
  | { ok: true; target: string; slug: string; title: string; remaining: number }
  | { ok: false; target?: string; error: string }
  | { ok: true; done: true; message: string };

/**
 * 한 번 실행에서 생성 시도에 쓸 시간 예산(ms) — encyclopedia/runner.ts 와 같은 이유·같은 값.
 *
 * 예전에는 "첫 번째 미발행 타깃" 하나만 시도했다. 그 지역에 활동 샵이 0곳이면
 * `no active shops` 로 실패하는데, 다음날도 같은 타깃을 집어들어 **큐가 영구히 막힌다.**
 * 실제로 2026-06-16 이후 59일간 21개에서 멈춰 신규 지역 페이지가 0개였다.
 * 개수 상한 대신 시간 상한을 쓰는 이유도 동일 — 실패 타깃이 상한만큼 쌓이면 교착이 재발한다.
 */
const GENERATION_BUDGET_MS = 240_000;

async function pickTargetCandidates(
  override: string | null,
): Promise<{ candidates: LocationTarget[]; publishedSize: number; totalTargets: number }> {
  const [published, regionNames] = await Promise.all([
    fetchPublishedLocationKeys(),
    fetchRegionNamesWithActiveShops(),
  ]);
  const targets = buildLocationTargets(regionNames);
  const candidates = override !== null
    ? targets.filter((t) => targetKey(t.region, t.style) === override)
    : targets.filter((t) => !published.has(targetKey(t.region, t.style)));
  return { candidates, publishedSize: published.size, totalTargets: targets.length };
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
  const { candidates, publishedSize, totalTargets } = await pickTargetCandidates(override);

  if (candidates.length === 0) {
    return {
      ok: true,
      done: true,
      message: `All ${String(totalTargets)} location targets already published`,
    };
  }

  const failures: string[] = [];
  const startedAt = Date.now();
  for (const target of candidates) {
    if (failures.length > 0 && Date.now() - startedAt > GENERATION_BUDGET_MS) {
      failures.push("budget exhausted — 다음 실행에서 이어서 시도한다");
      break;
    }
    const key = targetKey(target.region, target.style);
    try {
      const result = await generateAndStore(target);
      if (!result.ok) {
        failures.push(`${key}: ${result.error}`);
        continue;
      }
      revalidatePath("/location");
      notifySearchEngines([`/location/${result.slug}`, "/location"]);
      return {
        ok: true,
        target: key,
        slug: result.slug,
        title: result.title,
        // publishedSize 는 현재 타깃 목록에 없는 과거 발행분까지 세므로 음수가 될 수 있다.
        remaining: Math.max(0, totalTargets - publishedSize - (override !== null ? 0 : 1)),
      };
    } catch (e: unknown) {
      failures.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { ok: false, target: targetKey(candidates[0].region, candidates[0].style), error: failures.join(" | ") };
}
