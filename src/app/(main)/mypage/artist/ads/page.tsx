// @client-reason: Interactive ad management with dynamic state
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Crown,
    TrendingUp,
    Eye,
    MousePointerClick,
    CreditCard,
    Coins,
    ChevronLeft,
    CheckCircle2,
    Clock,
    XCircle,
    Sparkles,
    Shield,
    Search,
    Star,
    Zap,
    ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PortfolioSlotManager } from "@/components/ads/PortfolioSlotManager";
import type { AdSubscription } from "@/types/ads";
import { effectiveAdStatus, isAdRunning } from "@/lib/ad-status";

// ─── Types ───────────────────────────────────────────────

interface DashboardData {
    active: AdSubscription | null;
    subscriptions: AdSubscription[];
}

interface WalletData {
    balance: number;
    totalEarned: number;
    totalSpent: number;
}

// ─── Status Badge ────────────────────────────────────────

const STATUS_CONFIG: Record<string, { icon: React.ReactElement; label: string; className: string }> = {
    ACTIVE: { icon: <CheckCircle2 className="h-4 w-4" />, label: "활성", className: "bg-emerald-100 text-emerald-700" },
    PENDING: { icon: <Clock className="h-4 w-4" />, label: "대기", className: "bg-amber-100 text-amber-700" },
    EXPIRED: { icon: <XCircle className="h-4 w-4" />, label: "만료", className: "bg-zinc-100 text-zinc-600" },
    CANCELLED: { icon: <XCircle className="h-4 w-4" />, label: "취소", className: "bg-red-100 text-red-700" },
};

function StatusBadge({ status }: Readonly<{ status: string }>): React.ReactElement {
    // eslint-disable-next-line security/detect-object-injection -- Safe: known key lookup
    const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.EXPIRED;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.className}`}>
            {c.icon} {c.label}
        </span>
    );
}

// ─── Stat Card ───────────────────────────────────────────

function StatCard({ icon, label, value, sub }: Readonly<{
    icon: React.ReactElement; label: string; value: string | number; sub?: string;
}>): React.ReactElement {
    return (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {icon} {label}
            </div>
            <p className="text-xl font-bold text-foreground">{value}</p>
            {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
        </div>
    );
}

// ─── Benefits List ───────────────────────────────────────

function BenefitsList(): React.ReactElement {
    const benefits = [
        { icon: <Crown className="h-5 w-5 text-amber-500" />, title: "프리미엄 배너", desc: "홈 상단 슬라이더 노출" },
        { icon: <Search className="h-5 w-5 text-blue-500" />, title: "검색 상위 노출", desc: "반영구 검색 결과 최상단" },
        { icon: <Zap className="h-5 w-5 text-orange-500" />, title: "포트폴리오 부스트", desc: "검색 결과 내 높은 빈도 삽입" },
        { icon: <Star className="h-5 w-5 text-purple-500" />, title: "아티스트 추천", desc: "인기 아티스트 섹션 상단 고정" },
    ];
    return (
        <div className="grid grid-cols-2 gap-3">
            {benefits.map(b => (
                <div key={b.title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="mt-0.5 shrink-0">{b.icon}</div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">{b.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{b.desc}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Active Subscription Card ────────────────────────────

function ActiveSubscriptionCard({ sub }: Readonly<{ sub: AdSubscription }>): React.ReactElement {
    const expiresAt = sub.expires_at ? new Date(sub.expires_at) : null;
    const [now] = useState(() => Date.now());
    const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - now) / 86400000)) : 0;

    return (
        <div className="overflow-hidden rounded-2xl border border-emerald-300 shadow-md">
            <div className="flex items-center justify-between border-b border-emerald-200 bg-emerald-50 px-6 py-4">
                <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-emerald-600" />
                    <div>
                        <h3 className="text-lg font-bold text-foreground">프리미엄 광고 활성 중</h3>
                        <p className="text-sm text-muted-foreground">
                            만료까지 <span className="font-bold text-emerald-600">{daysLeft}일</span> 남음
                            {expiresAt ? <span className="ml-1">({expiresAt.toLocaleDateString("ko-KR")})</span> : null}
                        </p>
                    </div>
                </div>
                <StatusBadge status="ACTIVE" />
            </div>
            <div className="space-y-5 p-6">
                <div className="grid grid-cols-2 gap-3">
                    <StatCard icon={<Eye className="h-4 w-4 text-blue-500" />} label="총 노출" value={sub.impression_count.toLocaleString()} />
                    <StatCard icon={<MousePointerClick className="h-4 w-4 text-purple-500" />} label="총 클릭" value={sub.click_count.toLocaleString()} />
                </div>
                <BenefitsList />
            </div>
        </div>
    );
}

// ─── Subscription History ────────────────────────────────

function SubscriptionHistoryItem({ sub, now }: Readonly<{ sub: AdSubscription; now: number }>): React.ReactElement {
    return (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <div className="flex items-center gap-3">
                {/* status 컬럼은 만료 크론 실행 전까지 ACTIVE 로 남는다 → 만료일 반영한 실질 상태로 표시.
                    now 는 페이지가 고정한 시계 — 활성 목록과 다른 시계를 쓰면 같은 구독이 위/아래에서 갈린다 */}
                <StatusBadge status={effectiveAdStatus(sub.status, sub.expires_at, now)} />
                <span className="font-medium text-foreground">{sub.price_paid.toLocaleString()}원</span>
                {sub.duration_months > 1 ? (
                    <span className="text-xs text-muted-foreground">({sub.duration_months}개월)</span>
                ) : null}
            </div>
            <div className="text-right text-xs text-muted-foreground">
                {new Date(sub.created_at).toLocaleDateString("ko-KR")}
                {sub.paid_by_points > 0 ? (
                    <span className="ml-1 font-medium text-amber-600">(P {sub.paid_by_points.toLocaleString()})</span>
                ) : null}
            </div>
        </div>
    );
}

function SubscriptionHistory({ subscriptions, now }: Readonly<{ subscriptions: AdSubscription[]; now: number }>): React.ReactElement | null {
    if (subscriptions.length === 0) return null;
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
                <CreditCard className="h-4 w-4 text-muted-foreground" /> 결제 내역
            </h3>
            <div className="space-y-2">
                {subscriptions.map(sub => <SubscriptionHistoryItem key={sub.id} sub={sub} now={now} />)}
            </div>
        </div>
    );
}

// ─── Wallet Summary ──────────────────────────────────────

function WalletSummary({ wallet }: Readonly<{ wallet: WalletData }>): React.ReactElement {
    return (
        <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<Coins className="h-4 w-4 text-amber-500" />} label="보유 포인트" value={`${wallet.balance.toLocaleString()}P`} />
            <StatCard icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} label="총 적립" value={`${wallet.totalEarned.toLocaleString()}P`} />
            <StatCard icon={<CreditCard className="h-4 w-4 text-blue-500" />} label="총 사용" value={`${wallet.totalSpent.toLocaleString()}P`} />
        </div>
    );
}

// ─── Purchase CTA ────────────────────────────────────────

/** null = 조회 실패로 모름 → "없다" 고 단정하지 않는 중립 문구 */
function ctaLabel(hasActive: boolean | null): string {
    if (hasActive === null) return "광고 구매하기";
    return hasActive ? "추가 광고 구매하기" : "광고 시작하기";
}

function PurchaseCTA({ hasActive }: Readonly<{ hasActive: boolean | null }>): React.ReactElement {
    // 실행 중인 광고가 없는데 "추가" 라고 하면 거짓 안내 — 만료 반영 후엔 이 경우가 실제로 생긴다.
    // 조회 실패로 목록을 못 받았으면(null) "없다" 고 단정하지 않는다 — 중복 구매를 유도하게 된다.
    return (
        <Link
            href="/mypage/artist/ads/purchase"
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 px-6 py-5 text-base font-bold text-amber-700 transition-all hover:border-amber-500 hover:bg-amber-100 focus-visible:border-amber-500 focus-visible:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <ShoppingCart className="h-5 w-5" />
            <span>{ctaLabel(hasActive)}</span>
            <Sparkles className="h-5 w-5" />
        </Link>
    );
}

/** 조회 실패("모름")와 "활성 0건" 을 구분한다 — 섞으면 CTA 문구가 거짓말한다 */
function splitSubscriptions(dashboard: DashboardData | null, now: number): {
    loadedSubscriptions: AdSubscription[] | null;
    activeSubscriptions: AdSubscription[];
    hasActive: boolean | null;
} {
    const loadedSubscriptions = Array.isArray(dashboard?.subscriptions) ? dashboard.subscriptions : null;
    const activeSubscriptions = (loadedSubscriptions ?? []).filter(
        (s) => isAdRunning(s.status, s.expires_at, now),
    );
    return {
        loadedSubscriptions,
        activeSubscriptions,
        hasActive: loadedSubscriptions === null ? null : activeSubscriptions.length > 0,
    };
}

// ─── Data Hook ───────────────────────────────────────────

function useAdDashboard(authLoading: boolean, user: unknown): {
    dashboard: DashboardData | null; wallet: WalletData; loading: boolean;
} {
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [wallet, setWallet] = useState<WalletData>({ balance: 0, totalEarned: 0, totalSpent: 0 });
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [myRes, walletRes] = await Promise.all([
                fetch("/api/ads/my").then(r => r.json()),
                fetch("/api/points/balance").then(r => r.json()),
            ]);
            setDashboard(myRes as DashboardData);
            setWallet(walletRes as WalletData);
        } catch {
            // silently handle
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && user) fetchData();
    }, [authLoading, user, fetchData]);

    return { dashboard, wallet, loading };
}

// ─── Main Page Component ─────────────────────────────────

export default function AdManagementPage(): React.ReactElement {
    const router = useRouter();
    const { user, artist, isArtist, isLoading: authLoading } = useAuth();
    const { dashboard, wallet, loading } = useAdDashboard(authLoading, user);
    const [now] = useState(() => Date.now());

    if (authLoading || loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
        );
    }
    if (!isArtist) { router.push("/login"); return <div />; }
    if (!artist) { router.push("/register/artist"); return <div />; }

    const { loadedSubscriptions, activeSubscriptions, hasActive } = splitSubscriptions(dashboard, now);

    return (
        <div className="mx-auto w-full max-w-[1024px] pb-20">
            <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-4">
                <button onClick={() => router.back()} aria-label="뒤로 가기" className="rounded-lg p-2 transition-colors hover:bg-muted focus-visible:bg-muted">
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className="ml-2 text-lg font-bold text-foreground">광고 관리</h1>
            </header>

            <div className="space-y-6 p-4">
                <WalletSummary wallet={wallet} />

                {activeSubscriptions.map(sub => (
                    <ActiveSubscriptionCard key={sub.id} sub={sub} />
                ))}

                {activeSubscriptions.length > 0 ? <PortfolioSlotManager /> : null}

                <PurchaseCTA hasActive={hasActive} />

                {loadedSubscriptions ? (
                    <SubscriptionHistory subscriptions={loadedSubscriptions} now={now} />
                ) : null}
            </div>
        </div>
    );
}
