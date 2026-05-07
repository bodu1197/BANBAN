// @client-reason: Interactive payment flow with PortOne SDK, dynamic state
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Crown,
    Coins,
    ChevronLeft,
    Sparkles,
    Shield,
    Search,
    Star,
    Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { AdDurationOption, AdPlan } from "@/types/ads";

// ─── Helpers ─────────────────────────────────────────────

function calcTotalPrice(monthlyPrice: number, months: number, discountPercent: number): number {
    return Math.round(monthlyPrice * months * (100 - discountPercent) / 100);
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

// ─── Plan Selector ──────────────────────────────────────

const PLAN_PHOTOS: Record<string, string> = { "3": "3장 선택", "5": "5장 선택", "7": "7장 선택" };

function getPlanPhotoLabel(name: string): string {
    const match = /\((\d+)장\)/.exec(name);
    if (!match) return name;
    return PLAN_PHOTOS[match[1]] ?? name;
}

function PlanCard({ plan, isSelected, onSelect }: Readonly<{
    plan: AdPlan; isSelected: boolean; onSelect: () => void;
}>): React.ReactElement {
    return (
        <button
            key={plan.id}
            type="button"
            onClick={onSelect}
            className={`relative rounded-xl border-2 p-4 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                    ? "border-amber-500 bg-amber-50 shadow-md dark:border-amber-400 dark:bg-amber-950/30"
                    : "border-border bg-card hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/10 focus-visible:border-amber-300 focus-visible:bg-amber-50/50 dark:focus-visible:bg-amber-950/10"
            }`}
        >
            {isSelected ? (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
                    선택
                </span>
            ) : null}
            <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                {(plan.price / 10000).toFixed(0)}<span className="text-xs font-semibold">만원</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-foreground">{getPlanPhotoLabel(plan.name)}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">월 (부가세 포함)</p>
        </button>
    );
}

function PlanSelector({ plans, selectedId, onSelect }: Readonly<{
    plans: AdPlan[];
    selectedId: string;
    onSelect: (id: string) => void;
}>): React.ReactElement {
    return (
        <div className="grid grid-cols-3 gap-2">
            {plans.map(plan => (
                <PlanCard key={plan.id} plan={plan} isSelected={plan.id === selectedId} onSelect={() => onSelect(plan.id)} />
            ))}
        </div>
    );
}

// ─── Duration Selector ──────────────────────────────────

function DurationButton({ d, isSelected, monthlyPrice, onSelect }: Readonly<{
    d: AdDurationOption; isSelected: boolean; monthlyPrice: number; onSelect: () => void;
}>): React.ReactElement {
    const total = calcTotalPrice(monthlyPrice, d.months, d.discount_percent);
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`relative rounded-xl border-2 px-2 py-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                    ? "border-amber-500 bg-amber-50 shadow-md dark:border-amber-400 dark:bg-amber-950/30"
                    : "border-border bg-card hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/10 focus-visible:border-amber-300 focus-visible:bg-amber-50/50 dark:focus-visible:bg-amber-950/10"
            }`}
        >
            {d.discount_percent > 0 ? (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    -{d.discount_percent}%
                </span>
            ) : null}
            <p className="text-sm font-bold text-foreground">{d.label}</p>
            <p className="mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                {(total / 10000).toFixed(0)}만원
            </p>
        </button>
    );
}

function DurationSelector({ durations, selectedMonths, monthlyPrice, onSelect }: Readonly<{
    durations: AdDurationOption[];
    selectedMonths: number;
    monthlyPrice: number;
    onSelect: (months: number) => void;
}>): React.ReactElement {
    return (
        <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">이용 기간</p>
            <div className="grid grid-cols-5 gap-1.5">
                {durations.map(d => (
                    <DurationButton key={d.id} d={d} isSelected={d.months === selectedMonths} monthlyPrice={monthlyPrice} onSelect={() => onSelect(d.months)} />
                ))}
            </div>
        </div>
    );
}

// ─── Purchase Header ─────────────────────────────────────

function PurchaseHeader({ planName, durationLabel }: Readonly<{ planName: string; durationLabel: string }>): React.ReactElement {
    return (
        <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-100/60 px-6 py-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <div>
                <h3 className="text-lg font-bold text-foreground">{planName}</h3>
                <p className="text-sm text-muted-foreground">{durationLabel} 이용권 - 4대 프리미엄 혜택 모두 포함</p>
            </div>
        </div>
    );
}

// ─── Point Slider ────────────────────────────────────────

function PointSlider({ usePoints, maxPoints, walletBalance, cashNeeded, onChange }: Readonly<{
    usePoints: number; maxPoints: number; walletBalance: number; cashNeeded: number; onChange: (value: number) => void;
}>): React.ReactElement {
    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Coins className="h-4 w-4 text-amber-500" /> 포인트 사용
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{usePoints.toLocaleString()}P</span>
            </div>
            <input
                type="range"
                min={0}
                max={maxPoints}
                step={1000}
                value={usePoints}
                onChange={e => onChange(Number(e.target.value))}
                className="mb-3 w-full accent-amber-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>보유: {walletBalance.toLocaleString()}P</span>
                <span className="font-medium text-foreground">현금 결제: {cashNeeded.toLocaleString()}원</span>
            </div>
        </div>
    );
}

// ─── Purchase Button ─────────────────────────────────────

function PurchaseButton({ cashNeeded, isPurchasing, onClick }: Readonly<{
    cashNeeded: number; isPurchasing: boolean; onClick: () => void;
}>): React.ReactElement {
    return (
        <button
            onClick={onClick}
            disabled={isPurchasing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-amber-600 focus-visible:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
            {isPurchasing ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
                <>
                    <Sparkles className="h-5 w-5" />
                    {cashNeeded > 0 ? `${cashNeeded.toLocaleString()}원 결제하기` : "포인트로 구매하기"}
                </>
            )}
        </button>
    );
}

// ─── Price Display ───────────────────────────────────────

function PriceDisplay({ totalPrice, originalPrice, discount, durationDays }: Readonly<{
    totalPrice: number; originalPrice: number; discount: number; durationDays: number;
}>): React.ReactElement {
    return (
        <div className="text-center">
            {discount > 0 ? (
                <p className="text-sm text-muted-foreground line-through">{originalPrice.toLocaleString()}원</p>
            ) : null}
            <p className="text-4xl font-black text-amber-600 dark:text-amber-400">
                {totalPrice.toLocaleString()}<span className="text-lg font-semibold">원</span>
            </p>
            {discount > 0 ? (
                <p className="mt-1 text-sm font-semibold text-red-500">{discount.toLocaleString()}원 할인!</p>
            ) : null}
            <p className="mt-1 text-sm text-muted-foreground">{durationDays}일 이용권 (부가세 포함)</p>
        </div>
    );
}

// ─── Purchase Section ────────────────────────────────────

function PurchaseSection({ plan, duration, walletBalance, onPurchase, isPurchasing }: Readonly<{
    plan: AdPlan; duration: AdDurationOption; walletBalance: number;
    onPurchase: (usePoints: number) => void; isPurchasing: boolean;
}>): React.ReactElement {
    const totalPrice = calcTotalPrice(plan.price, duration.months, duration.discount_percent);
    const originalPrice = plan.price * duration.months;
    const discount = originalPrice - totalPrice;
    const maxUsable = Math.min(walletBalance, totalPrice);
    const [rawPoints, setUsePoints] = useState(maxUsable);
    const usePoints = Math.min(rawPoints, maxUsable);
    const cashNeeded = Math.max(0, totalPrice - usePoints);

    return (
        <div className="overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-md dark:border-amber-500/30 dark:from-amber-950/30 dark:to-orange-950/30">
            <PurchaseHeader planName={plan.name} durationLabel={duration.label} />
            <div className="space-y-5 p-6">
                <PriceDisplay totalPrice={totalPrice} originalPrice={originalPrice} discount={discount} durationDays={duration.months * 30} />
                <BenefitsList />
                <PointSlider usePoints={usePoints} maxPoints={maxUsable} walletBalance={walletBalance} cashNeeded={cashNeeded} onChange={setUsePoints} />
                <PurchaseButton cashNeeded={cashNeeded} isPurchasing={isPurchasing} onClick={() => onPurchase(usePoints)} />
            </div>
        </div>
    );
}

// ─── Data Hook ───────────────────────────────────────────

interface WalletData { balance: number; totalEarned: number; totalSpent: number }

function usePurchaseData(authLoading: boolean, user: unknown): {
    plans: AdPlan[]; durations: AdDurationOption[]; walletBalance: number; loading: boolean; fetchData: () => Promise<void>;
} {
    const [plans, setPlans] = useState<AdPlan[]>([]);
    const [durations, setDurations] = useState<AdDurationOption[]>([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [myRes, walletRes] = await Promise.all([
                fetch("/api/ads/my").then(r => r.json()),
                fetch("/api/points/balance").then(r => r.json()),
            ]);
            const typeArtist = (myRes as { typeArtist?: string }).typeArtist;
            const planType = typeArtist === "SEMI_PERMANENT" ? "SEMI_PERMANENT" : "TATTOO";
            const plansRes = await fetch(`/api/ads/plans?artistType=${planType}`).then(r => r.json());
            setPlans(plansRes.plans ?? []);
            setDurations(plansRes.durations ?? []);
            setWalletBalance((walletRes as WalletData).balance ?? 0);
        } catch {
            // silently handle
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && user) fetchData();
    }, [authLoading, user, fetchData]);

    return { plans, durations, walletBalance, loading, fetchData };
}

// ─── Payment Logic ───────────────────────────────────────

interface PurchaseResult { subscriptionId: string; merchantUid: string; cashAmount: number; planName: string; error?: string }

function useImpScript(): void {
    useEffect(() => {
        if (globalThis.IMP) return;
        const script = document.createElement("script");
        script.src = "https://cdn.iamport.kr/v1/iamport.js";
        script.async = true;
        document.head.appendChild(script);
    }, []);
}

function cancelPendingSubscription(subscriptionId: string): void {
    fetch("/api/ads/cancel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
    }).catch(() => { /* best effort */ });
}

function processPortOnePayment(data: PurchaseResult, onComplete: () => void): void {
    if (!globalThis.IMP) throw new Error("PortOne SDK not loaded");
    globalThis.IMP.init(process.env.NEXT_PUBLIC_PORTONE_IMP_CODE ?? "");
    globalThis.IMP.request_pay(
        { pg: "html5_inicis", pay_method: "card", merchant_uid: data.merchantUid, name: data.planName, amount: data.cashAmount },
        async (response) => {
            if (response.success) {
                await fetch("/api/ads/verify", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ impUid: response.imp_uid, subscriptionId: data.subscriptionId, expectedAmount: data.cashAmount }),
                });
            } else {
                cancelPendingSubscription(data.subscriptionId);
            }
            onComplete();
        },
    );
}

function usePurchaseFlow(onSuccess: () => void): {
    isPurchasing: boolean; handlePurchase: (planId: string, durationMonths: number, usePoints: number) => Promise<void>;
} {
    const [isPurchasing, setIsPurchasing] = useState(false);

    const handlePurchase = async (planId: string, durationMonths: number, usePoints: number): Promise<void> => {
        setIsPurchasing(true);
        try {
            const res = await fetch("/api/ads/purchase", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId, usePoints, durationMonths }),
            });
            const data = await res.json() as PurchaseResult;
            if (!res.ok) throw new Error(data.error ?? "purchase_failed");

            if (data.cashAmount > 0) {
                processPortOnePayment(data, () => { setIsPurchasing(false); onSuccess(); });
            } else {
                setIsPurchasing(false);
                onSuccess();
            }
        } catch {
            setIsPurchasing(false);
        }
    };

    return { isPurchasing, handlePurchase };
}

// ─── Page Header ─────────────────────────────────────────

function PageHeader({ onBack }: Readonly<{ onBack: () => void }>): React.ReactElement {
    return (
        <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-4">
            <button onClick={onBack} aria-label="뒤로 가기" className="rounded-lg p-2 transition-colors hover:bg-muted focus-visible:bg-muted">
                <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="ml-2 text-lg font-bold text-foreground">광고 구매</h1>
        </header>
    );
}

// ─── Purchase Content ────────────────────────────────────

function PurchaseContent({ plans, durations, walletBalance, onPurchase, isPurchasing }: Readonly<{
    plans: AdPlan[]; durations: AdDurationOption[]; walletBalance: number;
    onPurchase: (planId: string, duration: number, usePoints: number) => void; isPurchasing: boolean;
}>): React.ReactElement {
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [selectedDuration, setSelectedDuration] = useState(1);
    const effectivePlanId = selectedPlanId ?? plans[0]?.id ?? null;
    const selectedPlan = plans.find(p => p.id === effectivePlanId) ?? plans[0];
    const duration = durations.find(d => d.months === selectedDuration) ?? durations[0];

    return (
        <div className="space-y-4 p-4">
            <PlanSelector plans={plans} selectedId={selectedPlan?.id ?? ""} onSelect={setSelectedPlanId} />
            {selectedPlan && duration ? (
                <>
                    <DurationSelector durations={durations} selectedMonths={selectedDuration} monthlyPrice={selectedPlan.price} onSelect={setSelectedDuration} />
                    <PurchaseSection
                        plan={selectedPlan}
                        duration={duration}
                        walletBalance={walletBalance}
                        onPurchase={(pts) => onPurchase(selectedPlan.id, selectedDuration, pts)}
                        isPurchasing={isPurchasing}
                    />
                </>
            ) : null}
        </div>
    );
}

// ─── Main Page Component ─────────────────────────────────

export default function AdPurchasePage(): React.ReactElement {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const { plans, durations, walletBalance, loading, fetchData } = usePurchaseData(authLoading, user);

    const handleSuccess = useCallback((): void => {
        void fetchData();
        router.push("/mypage/artist/ads");
    }, [fetchData, router]);

    const { isPurchasing, handlePurchase } = usePurchaseFlow(handleSuccess);
    useImpScript();

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
            {plans.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">현재 이용 가능한 광고 상품이 없습니다.</p>
            ) : (
                <PurchaseContent plans={plans} durations={durations} walletBalance={walletBalance} onPurchase={handlePurchase} isPurchasing={isPurchasing} />
            )}
        </div>
    );
}
