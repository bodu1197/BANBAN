import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { todayKST, daysAgoKST } from "@/lib/utils/format";

interface ClickRow {
    id: string;
    artist_id: string;
    click_type: string;
    source_page: string;
    created_at: string;
    artists: { title: string; user_id: string } | null;
}

interface DailyStat { date: string; kakao: number; phone: number }
interface ArtistStat {
    artist_id: string;
    artist_name: string;
    kakao: number;
    phone: number;
    total: number;
    percent: number;
    dailyTrend: DailyStat[];
}
interface HourlyStat { hour: number; kakao: number; phone: number }
interface SourceStat { source: string; count: number; percent: number }
interface RecentClick { id: string; artist_name: string; click_type: string; source_page: string; created_at: string; artist_today_count: number }

const CLICK_KAKAO = "kakao";
const KST_TZ = "Asia/Seoul";

/** Convert a UTC timestamp to a KST "YYYY-MM-DD" date string */
function toKSTDate(utcStr: string): string {
    return new Date(utcStr).toLocaleDateString("sv-SE", { timeZone: KST_TZ });
}

/** Get KST hour (0-23) from a UTC timestamp */
function toKSTHour(utcStr: string): number {
    return Number(new Date(utcStr).toLocaleString("en-US", { timeZone: KST_TZ, hour: "numeric", hour12: false }));
}

function buildDateFilter(period: string): string {
    if (period === "daily") return daysAgoKST(30);
    if (period === "monthly") return daysAgoKST(365);
    if (period === "yearly") return daysAgoKST(365 * 5);
    return daysAgoKST(1);
}

function aggregateDaily(rows: ClickRow[]): DailyStat[] {
    const map = new Map<string, { kakao: number; phone: number }>();
    for (const r of rows) {
        const date = toKSTDate(r.created_at);
        const entry = map.get(date) ?? { kakao: 0, phone: 0 };
        if (r.click_type === CLICK_KAKAO) entry.kakao++;
        else entry.phone++;
        map.set(date, entry);
    }
    return Array.from(map.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateMonthly(rows: ClickRow[]): DailyStat[] {
    const map = new Map<string, { kakao: number; phone: number }>();
    for (const r of rows) {
        const month = toKSTDate(r.created_at).slice(0, 7);
        const entry = map.get(month) ?? { kakao: 0, phone: 0 };
        if (r.click_type === CLICK_KAKAO) entry.kakao++;
        else entry.phone++;
        map.set(month, entry);
    }
    return Array.from(map.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

function buildArtistTrend(rows: ClickRow[], artistId: string): DailyStat[] {
    const last7 = daysAgoKST(7);
    const artistRows = rows.filter(r => r.artist_id === artistId && r.created_at >= last7);
    const dayMap = new Map<string, { kakao: number; phone: number }>();
    for (const r of artistRows) {
        const d = toKSTDate(r.created_at);
        const e = dayMap.get(d) ?? { kakao: 0, phone: 0 };
        if (r.click_type === CLICK_KAKAO) e.kakao++;
        else e.phone++;
        dayMap.set(d, e);
    }
    return Array.from(dayMap.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateByArtist(rows: ClickRow[]): ArtistStat[] {
    const total = rows.length || 1;
    const map = new Map<string, ArtistStat>();
    for (const r of rows) {
        const entry = map.get(r.artist_id) ?? {
            artist_id: r.artist_id,
            artist_name: r.artists?.title ?? "알 수 없음",
            kakao: 0, phone: 0, total: 0, percent: 0,
            dailyTrend: [],
        };
        if (r.click_type === CLICK_KAKAO) entry.kakao++;
        else entry.phone++;
        entry.total++;
        entry.percent = Math.round((entry.total / total) * 100);
        map.set(r.artist_id, entry);
    }

    for (const [artistId, stat] of map) {
        stat.dailyTrend = buildArtistTrend(rows, artistId);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function aggregateHourly(rows: ClickRow[]): HourlyStat[] {
    const buckets: HourlyStat[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, kakao: 0, phone: 0 }));
    for (const r of rows) {
        const h = toKSTHour(r.created_at);
        const bucket = buckets[h]; // eslint-disable-line security/detect-object-injection -- Safe: h is 0-23
        if (r.click_type === CLICK_KAKAO) bucket.kakao++;
        else bucket.phone++;
    }
    return buckets;
}

function aggregateSource(rows: ClickRow[]): SourceStat[] {
    const total = rows.length || 1;
    const map = new Map<string, number>();
    for (const r of rows) {
        const src = r.source_page || "직접";
        map.set(src, (map.get(src) ?? 0) + 1);
    }
    return Array.from(map.entries())
        .map(([source, count]) => ({ source, count, percent: Math.round((count / total) * 100) }))
        .sort((a, b) => b.count - a.count);
}

function getRecentClicks(rows: ClickRow[]): RecentClick[] {
    // Count total clicks per artist within these rows
    const countMap = new Map<string, number>();
    for (const r of rows) {
        countMap.set(r.artist_id, (countMap.get(r.artist_id) ?? 0) + 1);
    }
    return rows.slice(-30).reverse().map(r => ({
        id: r.id,
        artist_name: r.artists?.title ?? "알 수 없음",
        click_type: r.click_type,
        source_page: r.source_page || "직접",
        created_at: r.created_at,
        artist_today_count: countMap.get(r.artist_id) ?? 1,
    }));
}

/** Get KST-based week boundaries { thisMondayStr, lastMondayStr } */
function getWeekBounds(): { thisMondayStr: string; lastMondayStr: string } {
    const kstNow = new Date(new Date().toLocaleString("en-US", { timeZone: KST_TZ }));
    const dayOfWeek = kstNow.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisMonday = new Date(kstNow);
    thisMonday.setDate(kstNow.getDate() - mondayOffset);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    return {
        thisMondayStr: thisMonday.toLocaleDateString("sv-SE"),
        lastMondayStr: lastMonday.toLocaleDateString("sv-SE"),
    };
}

function buildStats(clicks: ClickRow[], todayStr: string): {
    stats: Record<string, number>;
    todayClicks: ClickRow[];
} {
    const todayClicks = clicks.filter(r => toKSTDate(r.created_at) === todayStr);

    const d = new Date(new Date().toLocaleString("en-US", { timeZone: KST_TZ }));
    d.setDate(d.getDate() - 1);
    const yesterdayStr = d.toLocaleDateString("sv-SE");
    const yesterdayClicks = clicks.filter(r => toKSTDate(r.created_at) === yesterdayStr);

    const { thisMondayStr, lastMondayStr } = getWeekBounds();
    const thisWeekClicks = clicks.filter(r => {
        const dt = toKSTDate(r.created_at);
        return dt >= thisMondayStr && dt <= todayStr;
    });
    const lastWeekClicks = clicks.filter(r => {
        const dt = toKSTDate(r.created_at);
        return dt >= lastMondayStr && dt < thisMondayStr;
    });

    return {
        stats: {
            todayTotal: todayClicks.length,
            todayKakao: todayClicks.filter(r => r.click_type === CLICK_KAKAO).length,
            todayPhone: todayClicks.filter(r => r.click_type === "phone").length,
            yesterdayTotal: yesterdayClicks.length,
            thisWeekTotal: thisWeekClicks.length,
            lastWeekTotal: lastWeekClicks.length,
            periodTotal: clicks.length,
            periodKakao: clicks.filter(r => r.click_type === CLICK_KAKAO).length,
            periodPhone: clicks.filter(r => r.click_type === "phone").length,
        },
        todayClicks,
    };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const period = url.searchParams.get("period") ?? "daily";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = auth.supabase as any;
    const { data: rows } = await sb
        .from("contact_clicks")
        .select("id, artist_id, click_type, source_page, created_at, artists!inner(title, user_id)")
        .gte("created_at", buildDateFilter(period))
        .order("created_at", { ascending: true });

    const clicks = (rows ?? []) as ClickRow[];
    const { stats, todayClicks } = buildStats(clicks, todayKST());

    const chartData = period === "monthly" ? aggregateMonthly(clicks) : aggregateDaily(clicks);
    const artistStats = aggregateByArtist(clicks);
    const hourlyToday = aggregateHourly(todayClicks);
    const sourceBreakdown = aggregateSource(clicks);
    const recentClicks = getRecentClicks(todayClicks);

    return NextResponse.json({
        stats,
        chartData,
        artistStats,
        hourlyToday,
        sourceBreakdown,
        recentClicks,
    });
}
