import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { earnPoints, getArtistType, getPolicyAmount } from "@/lib/supabase/point-queries";
import { todayKST } from "@/lib/utils/format";
import { DEFAULT_POINT_RULES, getPointAmount } from "@/types/ads";

const STREAK_THRESHOLD = 7;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generic client
async function getYesterdayStreak(sb: any, userId: string): Promise<number> {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    now.setDate(now.getDate() - 1);
    const yesterdayKST = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const { data } = await sb.from("attendance_logs").select("streak").eq("user_id", userId).eq("checked_date", yesterdayKST).single();
    return (data as { streak: number } | null)?.streak ?? 0;
}

async function getAttendanceAmounts(artistType: string | null): Promise<{ attendance: number; streak: number }> {
    // DB 정책 우선, 없으면 코드 기본값 사용
    const policyAttendance = await getPolicyAmount("ATTENDANCE", artistType);
    const policyStreak = await getPolicyAmount("ATTENDANCE_STREAK", artistType);
    const attendanceRule = DEFAULT_POINT_RULES.find(r => r.reason === "ATTENDANCE");
    const streakRule = DEFAULT_POINT_RULES.find(r => r.reason === "ATTENDANCE_STREAK");
    return {
        attendance: policyAttendance ?? (attendanceRule ? getPointAmount(attendanceRule, artistType ?? undefined) : 1_000),
        streak: policyStreak ?? (streakRule ? getPointAmount(streakRule, artistType ?? undefined) : 5_000),
    };
}

async function grantStreakBonus(userId: string, streak: number, streakAmount: number, baseAmount: number): Promise<{ totalEarned: number; streakBonus: boolean }> {
    let totalEarned = baseAmount;
    let streakBonus = false;
    if (streak % STREAK_THRESHOLD === 0) {
        await earnPoints({ userId, amount: streakAmount, reason: "ATTENDANCE", description: `${STREAK_THRESHOLD}일 연속 출석 보너스` });
        totalEarned += streakAmount;
        streakBonus = true;
    }
    return { totalEarned, streakBonus };
}

// ─── POST — 출석 체크 ────────────────────────────────────

export async function POST(): Promise<NextResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = todayKST();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const { data: existing } = await sb.from("attendance_logs").select("id").eq("user_id", user.id).eq("checked_date", today).single();
    if (existing) {
        return NextResponse.json({ error: "이미 출석 체크를 완료했습니다", alreadyChecked: true }, { status: 400 });
    }

    const newStreak = (await getYesterdayStreak(sb, user.id)) + 1;
    const artistType = await getArtistType(user.id);
    const amounts = await getAttendanceAmounts(artistType);
    await sb.from("attendance_logs").insert({ user_id: user.id, checked_date: today, streak: newStreak });
    await earnPoints({ userId: user.id, amount: amounts.attendance, reason: "ATTENDANCE", description: `출석 체크 (${newStreak}일 연속)` });
    const { totalEarned, streakBonus } = await grantStreakBonus(user.id, newStreak, amounts.streak, amounts.attendance);

    return NextResponse.json({ success: true, streak: newStreak, earned: totalEarned, streakBonus });
}

// ─── GET — 출석 현황 조회 ────────────────────────────────

export async function GET(): Promise<NextResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = todayKST();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const { data: todayLog } = await sb.from("attendance_logs").select("streak").eq("user_id", user.id).eq("checked_date", today).single();
    const monthStart = `${today.slice(0, 7)}-01`;
    const { count } = await sb.from("attendance_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("checked_date", monthStart);

    return NextResponse.json({
        checkedToday: !!todayLog,
        streak: (todayLog as { streak: number } | null)?.streak ?? 0,
        monthCount: count ?? 0,
    });
}
