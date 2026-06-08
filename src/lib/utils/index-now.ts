/* eslint-disable no-console -- server-side logging for indexing diagnostics */
import "server-only";
import { PUBLIC_ENV } from "@/lib/config/env";

// IndexNow 키 — 공개값(설계상 비밀 아님).
// 이 상수와 public/{INDEXNOW_KEY}.txt (파일명 + 내용)는 항상 동일해야 한다.
const INDEXNOW_KEY = "b3f8a1d7e9c2456f8a0b1c3d5e7f9a2b";
const TIMEOUT_MS = 10_000;

export async function notifyIndexNow(
  urlPaths: string | string[],
): Promise<boolean> {
  try {
    const base = PUBLIC_ENV.SITE_URL.replace(/\/$/, "");
    const host = new URL(base).host;
    const paths = Array.isArray(urlPaths) ? urlPaths : [urlPaths];
    const urlList = paths
      .filter(Boolean)
      .map((p) => `${base}${p.startsWith("/") ? p : `/${p}`}`);
    if (urlList.length === 0) return false;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host,
          key: INDEXNOW_KEY,
          keyLocation: `${base}/${INDEXNOW_KEY}.txt`,
          urlList,
        }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status !== 200 && response.status !== 202) {
      const err = await response.text().catch(() => "[unreadable]");
      console.error(
        `[IndexNow] ${response.status} for ${urlList.length} url(s):`,
        err.slice(0, 300),
      );
      return false;
    }

    console.log(`[IndexNow] Submitted ${urlList.length} url(s) (${response.status})`);
    return true;
  } catch (error) {
    console.error("[IndexNow] Error:", error instanceof Error ? error.message : "unknown");
    return false;
  }
}
