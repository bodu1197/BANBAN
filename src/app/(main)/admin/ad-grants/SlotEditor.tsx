// @client-reason: Per-grant slot editor with parent-managed cache + try/catch error UX
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Save, Loader2, CheckCircle2 } from "lucide-react";
import { PortfolioThumb, type AdminPortfolioOption } from "@/components/admin/PortfolioThumb";

/** 저장 결과 톤 — 성공/실패/안내가 같은 색이면 실패를 성공으로 오인한다 */
const MSG_TONE = {
    idle: "text-zinc-300",
    ok: "font-medium text-emerald-300",
    fail: "font-medium text-red-300",
} as const;

function msgTone(msg: { ok: boolean } | null): keyof typeof MSG_TONE {
    if (!msg) return "idle";
    return msg.ok ? "ok" : "fail";
}

/** 저장 영역 안내문 — 읽기 전용 > 저장 결과 > 기본 안내 순 */
function StatusText({ msg, readOnly }: Readonly<{
    msg: { text: string; ok: boolean } | null; readOnly: boolean;
}>): React.ReactElement {
    const tone = readOnly ? "idle" : msgTone(msg);
    return (
        // role="alert" 를 같이 걸면 명시 aria-live 가 암시 assertive 를 덮어써 실패가 조용히 읽힌다
        <span
            // eslint-disable-next-line security/detect-object-injection -- tone 은 위에서 만든 리터럴 키
            className={`inline-flex items-center gap-1 text-xs ${MSG_TONE[tone]}`}
            // aria-live 값을 도중에 바꾸면(polite↔assertive) 같은 노드를 재사용하는 스크린리더에서
            // 변경이 반영되지 않아 오히려 announce 를 잃는다 → 고정 polite. 긴급도는 색·아이콘이 전달.
            aria-live="polite"
            aria-atomic="true"
        >
            {tone === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            {readOnly ? "종료된 부여라 변경할 수 없습니다" : msg?.text ?? "변경 후 저장 클릭"}
        </span>
    );
}

export interface SlotsCacheData {
    portfolios: AdminPortfolioOption[];
    currentSlots: string[];
    maxPortfolios: number;
}

interface Props {
    subscriptionId: string;
    /** 종료된 부여 — 무엇이 부스트 중이었는지는 보여주되 변경은 막는다 */
    readOnly?: boolean;
    onUpdated: () => void;
    /** 부모 페이지가 보유한 캐시 — 있으면 fetch 생략 */
    cache: SlotsCacheData | null;
    /** fetch 결과를 부모에게 전달 (다음 펼침 시 재사용) */
    onCacheUpdate: (data: SlotsCacheData) => void;
}

interface SlotEditorState {
    data: SlotsCacheData | null;
    selected: Set<string>;
    loading: boolean;
    fetchError: string | null;
    saving: boolean;
    msg: { text: string; ok: boolean } | null;
    handleToggle: (id: string) => void;
    handleSave: () => Promise<void>;
}

function useSlotEditor({ subscriptionId, onUpdated, cache, onCacheUpdate, readOnly }: Readonly<Props>): SlotEditorState {
    const [data, setData] = useState<SlotsCacheData | null>(cache);
    const [selected, setSelected] = useState<Set<string>>(new Set(cache?.currentSlots ?? []));
    const [loading, setLoading] = useState(!cache);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

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
        // PortfolioThumb 은 이미 선택된 항목의 클릭을 막지 않는다 → 읽기 전용에서는 여기서 차단
        if (!data || readOnly) return;
        // 저장 후 다시 고르면 "저장 완료" 문구가 남아 미저장 변경을 저장된 것으로 오인한다
        setMsg(null);
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else if (next.size < data.maxPortfolios) {
                next.add(id);
            }
            return next;
        });
    }, [data, readOnly]);

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
                setMsg({ text: `저장 완료 (${selected.size}개 슬롯)`, ok: true });
                // 캐시도 동기화 — currentSlots 만 변경, portfolios/max 는 유지
                if (data) onCacheUpdateRef.current({ ...data, currentSlots: [...selected] });
                onUpdated();
            } else {
                const err = await res.json() as { error?: string };
                setMsg({ text: err.error ?? "저장 실패", ok: false });
            }
        } catch (e: unknown) {
            setMsg({ text: e instanceof Error ? e.message : "네트워크 오류 — 저장 실패", ok: false });
        } finally {
            setSaving(false);
        }
    };

    return { data, selected, loading, fetchError, saving, msg, handleToggle, handleSave };
}

export function SlotEditor(props: Readonly<Props>): React.ReactElement {
    const { data, selected, loading, fetchError, saving, msg, handleToggle, handleSave } = useSlotEditor(props);
    const readOnly = props.readOnly ?? false;

    if (loading) {
        return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 motion-safe:animate-spin text-zinc-300" aria-hidden="true" /></div>;
    }
    if (fetchError) {
        return <p className="rounded-lg bg-red-500/20 p-3 text-center text-xs text-red-200" role="alert">{fetchError}</p>;
    }
    if (!data) return <p className="text-xs text-red-200" role="alert">슬롯 정보를 불러올 수 없습니다.</p>;
    if (data.portfolios.length === 0) {
        return (
            <p className="rounded-lg bg-white/5 p-3 text-center text-xs text-zinc-300">
                {readOnly ? "부스트 중이던 작품이 없습니다." : "이 회원은 등록된 작품이 없습니다."}
            </p>
        );
    }

    const atLimit = selected.size >= data.maxPortfolios;
    return (
        <SlotEditorBody
            data={data}
            selected={selected}
            atLimit={atLimit}
            msg={msg}
            saving={saving}
            readOnly={readOnly}
            onToggle={handleToggle}
            onSave={handleSave}
        />
    );
}

interface SlotEditorBodyProps {
    data: SlotsCacheData;
    selected: Set<string>;
    atLimit: boolean;
    msg: { text: string; ok: boolean } | null;
    saving: boolean;
    readOnly: boolean;
    onToggle: (id: string) => void;
    onSave: () => Promise<void>;
}

function SlotEditorBody({ data, selected, atLimit, msg, saving, readOnly, onToggle, onSave }: Readonly<SlotEditorBodyProps>): React.ReactElement {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-emerald-300">{readOnly ? "부스트 중이던 작품" : "부스트 작품 관리"}</span>
                {/* 읽기 전용에서 "2 / 5" 는 "3칸 더 채울 수 있다" 로 읽힌다 → 개수만 */}
                <span className={readOnly || !atLimit ? "text-zinc-300" : "text-emerald-300"}>
                    {readOnly ? `${selected.size}개` : `${selected.size} / ${data.maxPortfolios}`}
                </span>
            </div>
            <SlotGrid portfolios={data.portfolios} selected={selected} atLimit={atLimit} readOnly={readOnly} onToggle={onToggle} />
            <div className="flex items-center justify-between">
                {/* 성공/실패/안내가 같은 회색 평문이면 저장 실패를 성공으로 오인한다 → 결과에 따라 색 분기 */}
                <StatusText msg={msg} readOnly={readOnly} />
                {readOnly ? null : (
                <button
                    type="button"
                    disabled={saving}
                    aria-busy={saving}
                    onClick={() => void onSave()}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white motion-safe:transition-colors hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:bg-emerald-600 disabled:opacity-50"
                >
                    <Save className="h-4 w-4" /> {saving ? "저장중..." : "저장"}
                </button>
                )}
            </div>
        </div>
    );
}

interface SlotGridProps {
    portfolios: AdminPortfolioOption[];
    selected: Set<string>;
    atLimit: boolean;
    readOnly: boolean;
    onToggle: (id: string) => void;
}

function SlotGrid({ portfolios, selected, atLimit, readOnly, onToggle }: Readonly<SlotGridProps>): React.ReactElement {
    // 읽기 전용이면 선택되지 않은 항목은 보여줄 이유가 없다 — 무엇이 부스트 중이었는지만 남긴다
    const shown = readOnly ? portfolios.filter((p) => selected.has(p.id)) : portfolios;
    if (shown.length === 0) {
        return <p className="rounded-lg bg-white/5 p-3 text-center text-xs text-zinc-300">선택된 부스트 작품이 없었습니다.</p>;
    }
    return (
        <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-2 md:grid-cols-6 lg:grid-cols-8">
            {shown.map((p) => (
                <PortfolioThumb
                    key={p.id}
                    p={p}
                    selected={selected.has(p.id)}
                    disabled={atLimit}
                    readOnly={readOnly}
                    onToggle={onToggle}
                />
            ))}
        </div>
    );
}
