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
function purgeExpired(windowMs: number): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    cleanEntry(entry, now, windowMs);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

// Auto-purge every 60 seconds to prevent memory leaks
const PURGE_INTERVAL_MS = 60_000;
let purgeTimer: ReturnType<typeof setInterval> | null = null;

function ensurePurgeTimer(windowMs: number): void {
  if (purgeTimer) return;
  purgeTimer = setInterval(() => purgeExpired(windowMs), PURGE_INTERVAL_MS);
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
  ensurePurgeTimer(windowMs);

  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };

  cleanEntry(entry, now, windowMs);

  if (entry.timestamps.length >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.timestamps.push(now);
  store.set(key, entry);

  return { success: true, remaining: limit - entry.timestamps.length };
}

/** Extract client IP from request headers */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown"
  );
}

/** Standard 429 JSON response */
export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
    { status: 429 },
  );
}
