// ─── KST (Asia/Seoul) Date Helpers ──────────────────────────

const KST = "Asia/Seoul";

/** Format a date string as KST date: "2026. 4. 1." */
export function formatDateKST(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", { timeZone: KST, ...opts });
}

/** Format a date string as KST time: "오후 03:42" */
export function formatTimeKST(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr).toLocaleTimeString("ko-KR", { timeZone: KST, hour: "2-digit", minute: "2-digit", ...opts });
}

/** Format a date string as KST datetime: "2026. 4. 1. 오후 03:42" */
export function formatDateTimeKST(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr).toLocaleString("ko-KR", { timeZone: KST, ...opts });
}

/** Get today's date string in KST as "YYYY-MM-DD" */
export function todayKST(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: KST });
}

/** Get KST start-of-day as ISO string for DB queries */
export function todayStartKST(): string {
  const kstDate = todayKST();
  // KST 00:00 = UTC previous day 15:00
  return new Date(`${kstDate}T00:00:00+09:00`).toISOString();
}

/** Get KST start-of-month as ISO string for DB queries ("이번 달" 집계 기준) */
export function monthStartKST(): string {
  // 서버 로컬 타임존으로 new Date(y, m, 1) 을 만들면 Vercel(UTC)에서 KST 기준 1일 00:00~09:00 이 빠진다
  return new Date(`${todayKST().slice(0, 7)}-01T00:00:00+09:00`).toISOString();
}

/** Get a date N days ago in KST as ISO string */
export function daysAgoKST(n: number): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: KST }));
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${day}T00:00:00+09:00`).toISOString();
}

// ─── Price Helpers ──────────────────────────────────────────

/**
 * Format price in Korean won (만원 unit for >= 10,000 when evenly divisible).
 */
export function formatPrice(won: number): string {
  if (won >= 10000 && won % 10000 === 0) {
    return `${(won / 10000).toLocaleString("ko-KR")}만원`;
  }
  return `${won.toLocaleString("ko-KR")}원`;
}
