/* eslint-disable no-console -- server-side logging for indexing diagnostics */
import "server-only";
import { PUBLIC_ENV } from "@/lib/config/env";
import { notifyGoogleIndex, type IndexingType } from "./google-indexing";
import { notifyIndexNow } from "./index-now";

export type { IndexingType } from "./google-indexing";

/**
 * 검색엔진(Google Indexing API + IndexNow)에 URL 변경을 통지 — **await 가능** core.
 * 통지 완료 자체가 응답의 목적인 전용 라우트(예: ping-index)에서 await 한다 —
 * serverless 가 응답 후 함수를 중단해도 통지가 유실되지 않아야 하는 경우.
 */
export async function notifySearchEnginesAsync(
  urlPaths: string | string[],
  type: IndexingType = "URL_UPDATED",
): Promise<void> {
  if (PUBLIC_ENV.BLOCK_INDEXING) return;

  const paths = Array.isArray(urlPaths) ? urlPaths : [urlPaths];
  if (paths.length === 0) return;

  await Promise.allSettled([
    ...paths.map((p) => notifyGoogleIndex(p, type)),
    notifyIndexNow(paths),
  ]);
}

/**
 * fire-and-forget 통지 — 통지가 부수효과일 뿐이고 드문 유실이 허용되는 변이 라우트/서버 액션용
 * (본업은 데이터 변경, 통지 때문에 응답을 늦추지 않는다). 내부에서 모든 에러를 흡수하므로 .catch() 불필요.
 */
export function notifySearchEngines(
  urlPaths: string | string[],
  type: IndexingType = "URL_UPDATED",
): void {
  void notifySearchEnginesAsync(urlPaths, type).catch((e) => {
    console.error("[SearchNotify] Unexpected:", e instanceof Error ? e.message : "unknown");
  });
}
