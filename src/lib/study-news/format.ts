// 뉴스 표시용 순수 유틸(서버/클라 무관).

/** ISO → YYYY.MM.DD (KST 기준 — Vercel(UTC) 환경 날짜 어긋남 방지). 무효 시 ''. */
export function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")}`;
}

/** href 안전화: http(s) 만 허용(javascript:/data: 등 차단). 아니면 null → 링크 미렌더. */
export function safeSourceUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}
