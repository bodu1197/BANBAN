/* eslint-disable no-console -- server-side logging for indexing diagnostics */
import "server-only";
import { PUBLIC_ENV } from "@/lib/config/env";
import { notifyGoogleIndex, type IndexingType } from "./google-indexing";
import { notifyIndexNow } from "./index-now";

export type { IndexingType } from "./google-indexing";

/**
 * 검색엔진(Google Indexing API + IndexNow)에 URL 변경을 통지한다.
 * 내부에서 모든 에러를 흡수하므로 호출부에서 .catch() 불필요.
 */
export function notifySearchEngines(
  urlPaths: string | string[],
  type: IndexingType = "URL_UPDATED",
): void {
  if (PUBLIC_ENV.BLOCK_INDEXING) return;

  const paths = Array.isArray(urlPaths) ? urlPaths : [urlPaths];
  if (paths.length === 0) return;

  Promise.allSettled([
    ...paths.map((p) => notifyGoogleIndex(p, type)),
    notifyIndexNow(paths),
  ]).catch((e) => {
    console.error("[SearchNotify] Unexpected:", e instanceof Error ? e.message : "unknown");
  });
}
