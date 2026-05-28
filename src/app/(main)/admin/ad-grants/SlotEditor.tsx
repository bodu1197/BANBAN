// @client-reason: Per-grant slot editor with fetch on expand
"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Loader2 } from "lucide-react";
import { PortfolioThumb, type AdminPortfolioOption } from "@/components/admin/PortfolioThumb";

interface PortfoliosResponse {
    portfolios: AdminPortfolioOption[];
    currentSlots: string[];
    maxPortfolios: number;
}

export function SlotEditor({ subscriptionId, onUpdated }: Readonly<{
    subscriptionId: string; onUpdated: () => void;
}>): React.ReactElement {
    const [data, setData] = useState<PortfoliosResponse | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/admin/ads/grants/${subscriptionId}/portfolios`);
                if (res.ok && !cancelled) {
                    const json = await res.json() as PortfoliosResponse;
                    setData(json);
                    setSelected(new Set(json.currentSlots));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [subscriptionId]);

    const handleToggle = useCallback((id: string) => {
        if (!data) return;
        const next = new Set(selected);
        if (next.has(id)) {
            next.delete(id);
        } else if (next.size < data.maxPortfolios) {
            next.add(id);
        }
        setSelected(next);
    }, [selected, data]);

    const handleSave = async (): Promise<void> => {
        setSaving(true);
        setMsg(null);
        try {
            const res = await fetch(`/api/admin/ads/grants/${subscriptionId}/slots`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ portfolioIds: [...selected] }),
            });
            if (res.ok) {
                setMsg(`저장 완료 (${selected.size}개 슬롯)`);
                onUpdated();
            } else {
                const err = await res.json() as { error?: string };
                setMsg(err.error ?? "저장 실패");
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-zinc-400" /></div>;
    }
    if (!data) return <p className="text-xs text-red-300" role="alert">슬롯 정보를 불러올 수 없습니다.</p>;
    if (data.portfolios.length === 0) {
        return <p className="rounded-lg bg-white/5 p-3 text-center text-xs text-zinc-400">이 회원은 등록된 작품이 없습니다.</p>;
    }

    const atLimit = selected.size >= data.maxPortfolios;
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-emerald-400">부스트 작품 관리</span>
                <span className={`${atLimit ? "text-emerald-400" : "text-zinc-400"}`}>{selected.size} / {data.maxPortfolios}</span>
            </div>
            <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-2 md:grid-cols-6 lg:grid-cols-8">
                {data.portfolios.map((p) => (
                    <PortfolioThumb
                        key={p.id}
                        p={p}
                        selected={selected.has(p.id)}
                        disabled={atLimit}
                        onToggle={() => handleToggle(p.id)}
                    />
                ))}
            </div>
            <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400" aria-live="polite" aria-atomic="true">
                    {msg ?? "변경 후 저장 클릭"}
                </span>
                <button
                    type="button"
                    disabled={saving}
                    aria-busy={saving}
                    onClick={() => void handleSave()}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:bg-emerald-600 disabled:opacity-50"
                >
                    <Save className="h-3.5 w-3.5" /> {saving ? "저장중..." : "저장"}
                </button>
            </div>
        </div>
    );
}
