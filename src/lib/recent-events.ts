export interface RecentEventEntry {
  id: string;
  title: string;
  procedureName: string;
  heroImage: string | null;
  price: number;
  priceOrigin: number;
  discountRate: number | null;
  viewedAt: number;
}

const STORAGE_KEY = "banunni:recent-events";
const MAX_ENTRIES = 10;

function isBrowser(): boolean {
  return typeof globalThis !== "undefined" && typeof globalThis.localStorage !== "undefined";
}

function isValidEntry(value: unknown): value is RecentEventEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string"
    && typeof v.title === "string"
    && typeof v.procedureName === "string"
    && (v.heroImage === null || typeof v.heroImage === "string")
    && typeof v.price === "number"
    && typeof v.priceOrigin === "number"
    && (v.discountRate === null || typeof v.discountRate === "number")
    && typeof v.viewedAt === "number"
  );
}

export function getRecentEvents(): RecentEventEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry).sort((a, b) => b.viewedAt - a.viewedAt);
  } catch {
    return [];
  }
}

export function saveRecentEvent(entry: Omit<RecentEventEntry, "viewedAt">): void {
  if (!isBrowser()) return;
  try {
    const current = getRecentEvents().filter((e) => e.id !== entry.id);
    const next: RecentEventEntry[] = [{ ...entry, viewedAt: Date.now() }, ...current].slice(0, MAX_ENTRIES);
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded or storage unavailable — silently ignore
  }
}
