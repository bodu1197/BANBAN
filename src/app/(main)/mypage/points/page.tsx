// @client-reason: Interactive point dashboard with attendance check, pagination, dynamic data
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ChevronLeft,
    Coins,
    TrendingUp,
    TrendingDown,
    Timer,
    ArrowUpCircle,
    ArrowDownCircle,
    Gift,
    CalendarCheck,
    Image as ImageIcon,
    Star,
    CreditCard,
    RotateCcw,
    ShieldCheck,
    ChevronDown,
    Info,
    Megaphone,
    CheckCircle2,
    Flame,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PointCoinIcon } from "@/components/icons/PointCoinIcon";
import type { PointTransaction } from "@/types/ads";

// ─── Helpers ─────────────────────────────────────────────

const REASON_CONFIG: Record<string, { icon: React.ReactElement; label: string }> = {
    ATTENDANCE: { icon: <CalendarCheck className="h-4 w-4 text-blue-500" />, label: "출석 체크" },
    ATTENDANCE_STREAK: { icon: <Flame className="h-4 w-4 text-orange-500" />, label: "연속 출석 보너스" },
    SIGNUP_BONUS: { icon: <Gift className="h-4 w-4 text-emerald-500" />, label: "회원가입 축하" },
    PORTFOLIO_UPLOAD: { icon: <ImageIcon className="h-4 w-4 text-purple-500" />, label: "포트폴리오 등록" },
    REVIEW: { icon: <Star className="h-4 w-4 text-amber-500" />, label: "리뷰 작성" },
    CHAT_START: { icon: <Gift className="h-4 w-4 text-teal-500" />, label: "채팅 상담 시작" },
    LIKE: { icon: <Coins className="h-4 w-4 text-pink-500" />, label: "좋아요" },
    WELCOME_BONUS: { icon: <Gift className="h-4 w-4 text-emerald-500" />, label: "신규 아티스트 웰컴" },
    AD_PAYMENT: { icon: <CreditCard className="h-4 w-4 text-orange-500" />, label: "광고 결제" },
    AD_REFUND: { icon: <RotateCcw className="h-4 w-4 text-teal-500" />, label: "광고 환불" },
    ADMIN_GRANT: { icon: <ShieldCheck className="h-4 w-4 text-indigo-500" />, label: "관리자 지급" },
    ADMIN_DEDUCT: { icon: <ShieldCheck className="h-4 w-4 text-red-500" />, label: "관리자 차감" },
};

function getReasonConfig(reason: string): { icon: React.ReactElement; label: string } {
    // eslint-disable-next-line security/detect-object-injection -- Safe: known key lookup
    return REASON_CONFIG[reason] ?? { icon: <Coins className="h-4 w-4 text-zinc-500" />, label: reason };
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" });
}

function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });
}

// ─── Page Header ────────────────────────────────────────

function PageHeader({ onBack }: Readonly<{ onBack: () => void }>): React.ReactElement {
    return (
        <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-4">
            <button
                onClick={onBack}
                className="rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="뒤로 가기"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="ml-2 flex items-center gap-2">
                <PointCoinIcon className="h-5 w-5 text-amber-500" />
                <h1 className="text-lg font-bold text-foreground">포인트 관리</h1>
            </div>
        </header>
    );
}

// ─── Balance Card ───────────────────────────────────────

function BalanceCard({ balance, totalEarned, totalSpent }: Readonly<{
    balance: number;
    totalEarned: number;
    totalSpent: number;
}>): React.ReactElement {
    return (
        <div className="overflow-hidden rounded-2xl border border-amber-300 shadow-md dark:border-amber-500/30">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5 dark:from-amber-950/30 dark:to-orange-950/30">
                <div className="flex items-center gap-2">
                    <PointCoinIcon className="h-6 w-6 text-amber-500" />
                    <p className="text-sm font-medium text-muted-foreground">보유 포인트</p>
                </div>
                <p className="mt-1 text-3xl font-black text-amber-600 dark:text-amber-400">
                    {balance.toLocaleString()}<span className="text-lg font-semibold">P</span>
                </p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border border-t border-border bg-card">
                <div className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> 총 적립
                    </div>
                    <p className="mt-0.5 text-sm font-bold text-foreground">{totalEarned.toLocaleString()}P</p>
                </div>
                <div className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" /> 총 사용
                    </div>
                    <p className="mt-0.5 text-sm font-bold text-foreground">{totalSpent.toLocaleString()}P</p>
                </div>
            </div>
        </div>
    );
}

// ─── Attendance Check ───────────────────────────────────

interface AttendanceState {
    checkedToday: boolean;
    streak: number;
    monthCount: number;
    loading: boolean;
}

function AttendanceButtonContent({ loading, checkedToday, attendancePoints }: Readonly<{
    loading: boolean;
    checkedToday: boolean;
    attendancePoints: number;
}>): React.ReactElement {
    if (loading) {
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
    }
    if (checkedToday) {
        return <><CheckCircle2 className="h-4 w-4" /> 오늘 출석 완료! (+{attendancePoints.toLocaleString()}P)</>;
    }
    return <><CalendarCheck className="h-4 w-4" /> 출석 체크하기 (+{attendancePoints.toLocaleString()}P)</>;
}

function AttendanceSection({ state, onCheck, attendancePoints, streakPoints }: Readonly<{
    state: AttendanceState;
    onCheck: () => void;
    attendancePoints: number;
    streakPoints: number;
}>): React.ReactElement {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <CalendarCheck className="h-4 w-4 text-blue-500" /> 출석 체크
            </h3>
            <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/50 px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Flame className="h-3.5 w-3.5 text-orange-500" /> 연속 출석
                    </div>
                    <p className="mt-1 text-lg font-bold text-foreground">{state.streak}일</p>
                </div>
                <div className="rounded-xl bg-muted/50 px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <CalendarCheck className="h-3.5 w-3.5 text-blue-500" /> 이번 달
                    </div>
                    <p className="mt-1 text-lg font-bold text-foreground">{state.monthCount}회</p>
                </div>
            </div>
            <button
                type="button"
                onClick={onCheck}
                disabled={state.checkedToday || state.loading}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    state.checkedToday
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-blue-500 text-white shadow-lg hover:bg-blue-600 focus-visible:bg-blue-600 active:scale-[0.98]"
                } disabled:opacity-70`}
            >
                <AttendanceButtonContent loading={state.loading} checkedToday={state.checkedToday} attendancePoints={attendancePoints} />
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
                7일 연속 출석 시 보너스 +{streakPoints.toLocaleString()}P
            </p>
        </div>
    );
}

// ─── Quick Actions ──────────────────────────────────────

function QuickActions(): React.ReactElement {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-foreground">포인트 사용</h3>
            <Link
                href="/mypage/artist/ads"
                className="flex items-center gap-4 rounded-xl border border-border bg-gradient-to-r from-amber-50 to-orange-50 p-4 transition-colors hover:from-amber-100 hover:to-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:from-amber-950/20 dark:to-orange-950/20 dark:hover:from-amber-950/40 dark:hover:to-orange-950/40"
            >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
                    <Megaphone className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">광고 구매하기</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">포인트로 프리미엄 광고를 구매하세요</p>
                </div>
                <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
            </Link>
        </div>
    );
}

// ─── Point Guide ────────────────────────────────────────

function buildEarnRules(isSemi: boolean): { icon: React.ReactElement; label: string; point: string; note: string }[] {
    const p = (tattoo: number, semi: number): string => `${(isSemi ? semi : tattoo).toLocaleString()}P`;
    return [
        { icon: <Gift className="h-4 w-4 text-emerald-500" />, label: "회원가입 축하", point: p(30_000, 9_000), note: "전체" },
        { icon: <CalendarCheck className="h-4 w-4 text-blue-500" />, label: "출석 체크", point: p(1_000, 300), note: "매일 1회" },
        { icon: <CalendarCheck className="h-4 w-4 text-blue-500" />, label: "7일 연속 출석", point: `+${p(5_000, 1_500)}`, note: "보너스" },
        { icon: <Star className="h-4 w-4 text-amber-500" />, label: "리뷰 작성", point: p(20_000, 6_000), note: "1회/일" },
        { icon: <Coins className="h-4 w-4 text-pink-500" />, label: "좋아요", point: p(500, 150), note: "5회/일" },
        { icon: <ImageIcon className="h-4 w-4 text-purple-500" />, label: "포트폴리오 등록", point: p(1_000, 300), note: "아티스트" },
        { icon: <Gift className="h-4 w-4 text-emerald-500" />, label: "신규 아티스트 웰컴", point: p(100_000, 30_000), note: "아티스트" },
    ];
}

function PointGuideSection({ isSemi }: Readonly<{ isSemi: boolean }>): React.ReactElement {
    const EARN_RULES = buildEarnRules(isSemi);
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
                <Info className="h-4 w-4 text-amber-500" /> 포인트 적립 안내
            </h3>
            <ul className="space-y-3">
                {EARN_RULES.map((rule) => (
                    <li key={rule.label} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">{rule.icon}</div>
                        <span className="flex-1 text-sm text-foreground">{rule.label}</span>
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{rule.point}</span>
                        <span className="w-14 text-right text-[11px] text-muted-foreground">{rule.note}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-4 rounded-xl bg-amber-50 p-3.5 dark:bg-amber-950/20">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <Megaphone className="h-3.5 w-3.5" /> 포인트 사용처
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-600 dark:text-amber-400/80">
                    적립된 포인트는 홈페이지 내 <strong>광고 구매 시 현금 대신 결제 수단</strong>으로 사용할 수 있습니다.
                </p>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                * 포인트는 현금 환불 및 타인 양도가 불가합니다.
            </p>
        </div>
    );
}

// ─── Transaction Item ───────────────────────────────────

function TransactionItem({ tx }: Readonly<{ tx: PointTransaction }>): React.ReactElement {
    const isEarn = tx.amount > 0;
    const config = getReasonConfig(tx.reason);
    const isExpired = tx.expired;

    return (
        <div className={`flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm ${isExpired ? "opacity-50" : ""}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                {config.icon}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{config.label}</p>
                    {isExpired && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-500/20 dark:text-red-400">소멸</span>
                    )}
                    {tx.type === "EXPIRE" && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400">기한만료</span>
                    )}
                </div>
                {tx.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{tx.description}</p>
                )}
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{formatDate(tx.created_at)}</span>
                    <span>{formatTime(tx.created_at)}</span>
                    {tx.expires_at && !isExpired && (
                        <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                            <Timer className="h-3 w-3" />
                            {formatDate(tx.expires_at)} 만료
                        </span>
                    )}
                </div>
            </div>
            <div className="shrink-0 text-right">
                <div className={`flex items-center gap-1 text-sm font-bold ${isEarn ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {isEarn ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                    {isEarn ? "+" : ""}{tx.amount.toLocaleString()}P
                </div>
            </div>
        </div>
    );
}

// ─── Transaction List ───────────────────────────────────

function TransactionList({ transactions, total, loadingMore, onLoadMore }: Readonly<{
    transactions: PointTransaction[];
    total: number;
    loadingMore: boolean;
    onLoadMore: () => void;
}>): React.ReactElement {
    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">포인트 내역</h2>
                <span className="text-xs text-muted-foreground">총 {total}건</span>
            </div>

            {transactions.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-12 text-center">
                    <PointCoinIcon className="mx-auto h-10 w-10 text-muted-foreground/30" />
                    <p className="mt-3 text-sm text-muted-foreground">아직 포인트 내역이 없습니다.</p>
                    <p className="mt-1 text-xs text-muted-foreground">출석 체크로 첫 포인트를 적립해보세요!</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {transactions.map(tx => (
                        <TransactionItem key={tx.id} tx={tx} />
                    ))}
                </div>
            )}

            {transactions.length < total && (
                <button
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                    {loadingMore ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                    ) : (
                        <>
                            <ChevronDown className="h-4 w-4" /> 더 보기 ({total - transactions.length}건 남음)
                        </>
                    )}
                </button>
            )}
        </div>
    );
}

// ─── Hooks ──────────────────────────────────────────────

const PAGE_SIZE = 20;

function usePointsData(authLoading: boolean, user: unknown): {
    balance: number; totalEarned: number; totalSpent: number;
    transactions: PointTransaction[]; total: number;
    loading: boolean; loadingMore: boolean; handleLoadMore: () => Promise<void>;
    refetchBalance: () => Promise<void>;
    artistType: string | null;
} {
    const [balance, setBalance] = useState(0);
    const [totalEarned, setTotalEarned] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);
    const [artistType, setArtistType] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<PointTransaction[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchBalance = useCallback(async () => {
        const res = await fetch("/api/points/balance");
        if (!res.ok) return;
        const data = await res.json() as { balance: number; totalEarned: number; totalSpent: number; artistType: string | null };
        setBalance(data.balance);
        setTotalEarned(data.totalEarned);
        setTotalSpent(data.totalSpent);
        setArtistType(data.artistType);
    }, []);

    const fetchHistory = useCallback(async (offset: number, append: boolean) => {
        const res = await fetch(`/api/points/history?limit=${PAGE_SIZE}&offset=${offset}`);
        if (!res.ok) return;
        const data = await res.json() as { transactions: PointTransaction[]; total: number };
        setTransactions(prev => append ? [...prev, ...data.transactions] : data.transactions);
        setTotal(data.total);
    }, []);

    useEffect(() => {
        if (!authLoading && user) {
            let cancelled = false;
            (async () => {
                await Promise.all([fetchBalance(), fetchHistory(0, false)]);
                if (!cancelled) setLoading(false);
            })();
            return () => { cancelled = true; };
        }
        return undefined;
    }, [authLoading, user, fetchBalance, fetchHistory]);

    const handleLoadMore = async (): Promise<void> => {
        setLoadingMore(true);
        await fetchHistory(transactions.length, true);
        setLoadingMore(false);
    };

    return { balance, totalEarned, totalSpent, transactions, total, loading, loadingMore, handleLoadMore, refetchBalance: fetchBalance, artistType };
}

async function processAttendanceCheck(
    setState: React.Dispatch<React.SetStateAction<AttendanceState>>,
    onPointsChanged: () => Promise<void>,
): Promise<void> {
    const res = await fetch("/api/points/attendance", { method: "POST" });
    const data = await res.json() as { success?: boolean; streak?: number; alreadyChecked?: boolean };
    if (data.success) {
        setState(prev => ({ checkedToday: true, streak: data.streak ?? prev.streak, monthCount: prev.monthCount + 1, loading: false }));
        await onPointsChanged();
    } else {
        setState(prev => ({ ...prev, checkedToday: data.alreadyChecked ?? prev.checkedToday, loading: false }));
    }
}

function useAttendance(authLoading: boolean, user: unknown, onPointsChanged: () => Promise<void>): {
    state: AttendanceState; handleCheck: () => void;
} {
    const [state, setState] = useState<AttendanceState>({ checkedToday: false, streak: 0, monthCount: 0, loading: true });

    useEffect(() => {
        if (!authLoading && user) {
            let cancelled = false;
            fetch("/api/points/attendance")
                .then(r => r.json())
                .then((data: { checkedToday: boolean; streak: number; monthCount: number }) => {
                    if (!cancelled) setState({ ...data, loading: false });
                })
                .catch(() => { if (!cancelled) setState(prev => ({ ...prev, loading: false })); });
            return () => { cancelled = true; };
        }
        return undefined;
    }, [authLoading, user]);

    const handleCheck = (): void => {
        if (state.checkedToday || state.loading) return;
        setState(prev => ({ ...prev, loading: true }));
        processAttendanceCheck(setState, onPointsChanged).catch(() => {
            setState(prev => ({ ...prev, loading: false }));
        });
    };

    return { state, handleCheck };
}

// ─── Main ───────────────────────────────────────────────

export default function PointsManagementPage(): React.ReactElement {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const {
        balance, totalEarned, totalSpent,
        transactions, total, loading, loadingMore, handleLoadMore,
        refetchBalance, artistType,
    } = usePointsData(authLoading, user);
    const isSemi = artistType === "SEMI_PERMANENT";

    const refetchAll = useCallback(async () => {
        await refetchBalance();
    }, [refetchBalance]);

    const { state: attendanceState, handleCheck } = useAttendance(authLoading, user, refetchAll);

    if (authLoading || loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[767px] pb-20">
            <PageHeader onBack={() => router.back()} />
            <div className="space-y-5 p-4">
                <BalanceCard balance={balance} totalEarned={totalEarned} totalSpent={totalSpent} />
                <AttendanceSection state={attendanceState} onCheck={handleCheck} attendancePoints={isSemi ? 300 : 1_000} streakPoints={isSemi ? 1_500 : 5_000} />
                <QuickActions />
                <PointGuideSection isSemi={isSemi} />
                <TransactionList
                    transactions={transactions}
                    total={total}
                    loadingMore={loadingMore}
                    onLoadMore={handleLoadMore}
                />
            </div>
        </div>
    );
}
