// @client-reason: Per-grant slot editor with parent-managed cache + try/catch error UX
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Save, Loader2 } from "lucide-react";
import { PortfolioThumb, type AdminPortfolioOption } from "@/components/admin/PortfolioThumb";

export interface SlotsCacheData {
    portfolios: AdminPortfolioOption[];
    currentSlots: string[];
    maxPortfolios: number;
}

interface Props {
    subscriptionId: string;
    onUpdated: () => void;
    /** 부모 페이지가 보유한 캐시 — 있으면 fetch 생략 */
    cache: SlotsCacheData | null;
    /** fetch 결과를 부모에게 전달 (다음 펼침 시 재사용) */
    onCacheUpdate: (data: SlotsCacheData) => void;
}

export function SlotEditor({ subscriptionId, onUpdated, cache, onCacheUpdate }: Readonly<Props>): React.ReactElement {
    const [data, setData] = useState<SlotsCacheData | null>(cache);
    const [selected, setSelected] = useState<Set<string>>(new Set(cache?.currentSlots ?? []));
    const [loading, setLoading] = useState(!cache);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    // 부모 인라인 람다로 매번 새 함수가 와도 useEffect deps 안정화 — fetch 재실행 방지
    const onCacheUpdateRef = useRef(onCacheUpdate);
    useEffect(() => { onCacheUpdateRef.current = onCacheUpdate; }, [onCacheUpdate]);

    // 캐시가 있으면 fetch 생략 — 부모가 보유한 데이터 그대로 사용
    useEffect(() => {
        if (cache) {
            setData(cache);
            setSelected(new Set(cache.currentSlots));
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/admin/ads/grants/${subscriptionId}/portfolios`);
                if (!res.ok) {
                    const err = await res.json() as { error?: string };
                    throw new Error(err.error ?? "슬롯 정보 조회 실패");
                }
                const json = await res.json() as SlotsCacheData;
                if (!cancelled) {
                    setData(json);
                    setSelected(new Set(json.currentSlots));
                    setFetchError(null);
                    onCacheUpdateRef.current(json);
                }
            } catch (e: unknown) {
                if (!cancelled) {
                    setFetchError(e instanceof Error ? e.message : "네트워크 오류");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [subscriptionId, cache]);

    // setState updater 패턴 — prev 로 최신 state 참조해 deps 에 selected 제외.
    // 결과: handleToggle 안정화 → PortfolioThumb React.memo 발휘 (50개 그리드에서 리렌더 1회).
    const handleToggle = useCallback((id: string) => {
        if (!data) return;
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else if (next.size < data.maxPortfolios) {
                next.add(id);
            }
            return next;
        });
    }, [data]);

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
                // 캐시도 동기화 — currentSlots 만 변경, portfolios/max 는 유지
                if (data) onCacheUpdateRef.current({ ...data, currentSlots: [...selected] });
                onUpdated();
            } else {
                const err = await res.json() as { error?: string };
                setMsg(err.error ?? "저장 실패");
            }
        } catch (e: unknown) {
            setMsg(e instanceof Error ? e.message : "네트워크 오류 — 저장 실패");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 motion-safe:animate-spin text-zinc-300" aria-hidden="true" /></div>;
    }
    if (fetchError) {
        return <p className="rounded-lg bg-red-500/20 p-3 text-center text-xs text-red-200" role="alert">{fetchError}</p>;
    }
    if (!data) return <p className="text-xs text-red-200" role="alert">슬롯 정보를 불러올 수 없습니다.</p>;
    if (data.portfolios.length === 0) {
        return <p className="rounded-lg bg-white/5 p-3 text-center text-xs text-zinc-300">이 회원은 등록된 작품이 없습니다.</p>;
    }

    const atLimit = selected.size >= data.maxPortfolios;
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-emerald-300">부스트 작품 관리</span>
                <span className={`${atLimit ? "text-emerald-300" : "text-zinc-300"}`}>{selected.size} / {data.maxPortfolios}</span>
            </div>
            <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-2 md:grid-cols-6 lg:grid-cols-8">
                {data.portfolios.map((p) => (
                    <PortfolioThumb
                        key={p.id}
                        p={p}
                        selected={selected.has(p.id)}
                        disabled={atLimit}
                        onToggle={handleToggle}
                    />
                ))}
            </div>
            <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-300" aria-live="polite" aria-atomic="true">
                    {msg ?? "변경 후 저장 클릭"}
                </span>
                <button
                    type="button"
                    disabled={saving}
                    aria-busy={saving}
                    onClick={() => void handleSave()}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white motion-safe:transition-colors hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:bg-emerald-600 disabled:opacity-50"
                >
                    <Save className="h-4 w-4" /> {saving ? "저장중..." : "저장"}
                </button>
            </div>
        </div>
    );
}
