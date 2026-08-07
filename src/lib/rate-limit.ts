/**
 * In-memory sliding window rate limiter.
 * No external dependencies (Redis, etc.) — uses a simple Map.
 * Expired entries are auto-cleaned on each call.
 *
 * ⚠️ Vercel serverless: store는 instance 별로 격리되므로
 * 동일 IP가 여러 instance에 라우팅되면 실효 limit이 `limit × N`이 된다.
 * 분석(idempotent insert)·로그인 시도(보안 fail-safe)에는 허용 범위이나,
 * 결제·미션 크리티컬 보호에는 Redis 백엔드 필요.
 */
import { NextResponse } from "next/server";


interface RateLimitEntry {
  timestamps: number[];
  /** 이 키의 윈도우 길이 — 청소 주기가 첫 호출자의 값을 쓰면 긴 윈도우가 잘려버린다. */
  windowMs: number;
}

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
}

const store = new Map<string, RateLimitEntry>();

/** Remove timestamps older than the window */
function cleanEntry(entry: RateLimitEntry, now: number, windowMs: number): void {
  const cutoff = now - windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
}

/** Purge entries with no recent timestamps (runs periodically) */
function purgeExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    cleanEntry(entry, now, entry.windowMs);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

// Auto-purge every 60 seconds to prevent memory leaks
const PURGE_INTERVAL_MS = 60_000;
let purgeTimer: ReturnType<typeof setInterval> | null = null;

function ensurePurgeTimer(): void {
  if (purgeTimer) return;
  purgeTimer = setInterval(purgeExpired, PURGE_INTERVAL_MS);
  // Allow Node.js to exit even if the timer is active
  if (typeof purgeTimer === "object" && "unref" in purgeTimer) {
    purgeTimer.unref();
  }
}

/**
 * Check and consume a rate limit token.
 *
 * @param options.key     - Unique identifier (e.g. "login:192.168.1.1")
 * @param options.limit   - Max requests allowed in the window
 * @param options.windowMs - Sliding window duration in milliseconds
 * @returns `{ success, remaining }` — success=false means 429
 */
export function rateLimit({ key, limit, windowMs }: Readonly<RateLimitOptions>): RateLimitResult {
  ensurePurgeTimer();

  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [], windowMs };
  entry.windowMs = windowMs;

  cleanEntry(entry, now, windowMs);

  if (entry.timestamps.length >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.timestamps.push(now);
  store.set(key, entry);

  return { success: true, remaining: limit - entry.timestamps.length };
}

/**
 * Extract client IP from a Request or a bare Headers (server action: `await headers()`).
 *
 * Vercel 이 직접 심는 `x-vercel-forwarded-for` 를 먼저 본다 —
 * `x-forwarded-for` 는 클라이언트가 앞쪽에 값을 끼워 넣을 수 있어 신뢰도가 낮다.
 */
export function getClientIp(source: Request | Headers): string {
  // 🔴 `"headers" in source` 로 가르면 안 된다 — next/headers 의 HeadersAdapter 는
  //    Headers 이면서도 own 프로퍼티 `headers` 를 갖고 있어 Request 로 오인된다.
  //    (실측: `"headers" in adapter === true`, `adapter instanceof Headers === true`)
  const headers = source instanceof Headers ? source : source.headers;
  return (
    headers.get("x-vercel-forwarded-for")?.split(",")[0].trim()
    || headers.get("x-forwarded-for")?.split(",")[0].trim()
    || headers.get("x-real-ip")
    || "unknown"
  );
}

/** Standard 429 JSON response */
export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
    { status: 429 },
  );
}
