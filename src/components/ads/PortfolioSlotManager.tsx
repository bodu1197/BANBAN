// @client-reason: Interactive portfolio selection with fetch + state management
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ImageIcon, Check, Loader2 } from "lucide-react";

interface SlotPortfolio {
    id: string;
    title: string;
    thumbnail: string | null;
}

interface SubscriptionSlot {
    subscriptionId: string;
    planName: string;
    planPrice: number;
    maxPortfolios: number;
    slots: string[];
}

interface SlotData {
    subscriptions: SubscriptionSlot[];
    portfolios: SlotPortfolio[];
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const v of a) { if (!b.has(v)) return false; }
    return true;
}

function getThumbnailBorderClass(isSelected: boolean, disabled: boolean): string {
    if (isSelected) return "border-amber-500 shadow-lg ring-2 ring-amber-500/30";
    if (disabled) return "cursor-not-allowed border-border opacity-40";
    return "border-border hover:border-amber-300 focus-visible:border-amber-300";
}

function PortfolioThumbnail({ portfolio, isSelected, onToggle, disabled }: Readonly<{
    portfolio: SlotPortfolio;
    isSelected: boolean;
    onToggle: () => void;
    disabled: boolean;
}>): React.ReactElement {
    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={disabled && !isSelected}
            className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${getThumbnailBorderClass(isSelected, disabled)}`}
            aria-label={`${portfolio.title} ${isSelected ? "선택됨" : "선택"}`}
            aria-pressed={isSelected}
        >
            {portfolio.thumbnail ? (
                <Image src={portfolio.thumbnail} alt={portfolio.title} fill sizes="120px" className="object-cover" />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
            )}
            {isSelected ? (
                <div className="absolute inset-0 flex items-center justify-center bg-amber-500/40">
                    <div className="rounded-full bg-amber-500 p-1.5"><Check className="h-4 w-4 text-white" /></div>
                </div>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
                <p className="truncate text-[10px] font-medium text-white">{portfolio.title}</p>
            </div>
        </button>
    );
}

function SlotHeader({ planName, priceLabel, count, max }: Readonly<{
    planName: string; priceLabel: string; count: number; max: number;
}>): React.ReactElement {
    const atLimit = count >= max;
    return (
        <div className="mb-4 flex items-center justify-between">
            <div>
                <h3 className="text-sm font-bold text-foreground">{planName}</h3>
                <p className="text-xs text-muted-foreground">{priceLabel}/월</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                atLimit
                    ? "bg-amber-100 text-amber-700"
                    : "bg-muted text-muted-foreground"
            }`}>
                {count} / {max}
            </span>
        </div>
    );
}

function SaveButton({ saving, disabled, onClick }: Readonly<{
    saving: boolean; disabled: boolean; onClick: () => void;
}>): React.ReactElement {
    return (
        <div className="mt-4">
            <button
                type="button"
                onClick={onClick}
                disabled={saving || disabled}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-amber-600 focus-visible:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                저장
            </button>
        </div>
    );
}

function SubscriptionSlotSection({ sub, portfolios, onSave, savingId }: Readonly<{
    sub: SubscriptionSlot;
    portfolios: SlotPortfolio[];
    onSave: (subscriptionId: string, portfolioIds: string[]) => void;
    savingId: string | null;
}>): React.ReactElement {
    const [selected, setSelected] = useState<Set<string>>(() => new Set(sub.slots));
    const atLimit = selected.size >= sub.maxPortfolios;
    const hasChanged = !setsEqual(selected, new Set(sub.slots));
    const priceLabel = `${(sub.planPrice / 10000).toFixed(0)}만원`;

    const handleToggle = useCallback((id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); }
            return next;
        });
    }, []);

    return (
        <div className="rounded-2xl border border-amber-300 bg-card p-5 shadow-sm">
            <SlotHeader planName={sub.planName} priceLabel={priceLabel} count={selected.size} max={sub.maxPortfolios} />
            <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                {portfolios.map(p => (
                    <PortfolioThumbnail
                        key={p.id}
                        portfolio={p}
                        isSelected={selected.has(p.id)}
                        onToggle={() => handleToggle(p.id)}
                        disabled={atLimit && !selected.has(p.id)}
                    />
                ))}
            </div>
            <SaveButton saving={savingId === sub.subscriptionId} disabled={!hasChanged} onClick={() => onSave(sub.subscriptionId, [...selected])} />
        </div>
    );
}

function useSlotData(): { data: SlotData | null; loading: boolean; refresh: () => Promise<void> } {
    const [data, setData] = useState<SlotData | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch("/api/ads/slots");
            if (!res.ok) { setData(null); return; }
            setData(await res.json() as SlotData);
        } catch { setData(null); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);
    return { data, loading, refresh };
}

export function PortfolioSlotManager(): React.ReactElement {
    const { data, loading, refresh } = useSlotData();
    const [savingId, setSavingId] = useState<string | null>(null);

    const handleSave = useCallback(async (subscriptionId: string, portfolioIds: string[]) => {
        setSavingId(subscriptionId);
        try {
            await fetch("/api/ads/slots", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscriptionId, portfolioIds }),
            });
            await refresh();
        } catch { /* silently handle */ }
        finally { setSavingId(null); }
    }, [refresh]);

    if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;
    if (!data || data.portfolios.length === 0) return <></>;

    return (
        <div className="space-y-4">
            {data.subscriptions.map(sub => (
                <SubscriptionSlotSection
                    key={sub.subscriptionId}
                    sub={sub}
                    portfolios={data.portfolios}
                    onSave={handleSave}
                    savingId={savingId}
                />
            ))}
        </div>
    );
}
