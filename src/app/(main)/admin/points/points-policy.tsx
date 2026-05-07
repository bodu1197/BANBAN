// @client-reason: Policy table with inline editing and toggle
"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import type { PolicyItem } from "./points-types";
import { getTargetLabel } from "./points-types";

// ─── Policy Amount Cell ──────────────────────────────────

function PolicyAmountCell({ editing, amt, setAmt, displayAmount }: Readonly<{
    editing: boolean; amt: string; setAmt: (v: string) => void; displayAmount: number;
}>): React.ReactElement {
    if (editing) {
        return <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} className="w-24 rounded border border-white/20 bg-white/10 px-2 py-1 text-sm text-white focus:outline-none" />;
    }
    return <span className="text-sm font-medium text-amber-400">{displayAmount.toLocaleString()}P</span>;
}

// ─── Policy Row ──────────────────────────────────────────

function PolicyRow({ policy, onUpdate }: Readonly<{
    policy: PolicyItem;
    onUpdate: (id: string, amount: number, semiAmount: number | null, isActive: boolean) => Promise<void>;
}>): React.ReactElement {
    const [editing, setEditing] = useState(false);
    const [amt, setAmt] = useState(String(policy.amount));
    const [semiAmt, setSemiAmt] = useState(String(policy.semi_amount ?? 0));
    const save = async (): Promise<void> => { await onUpdate(policy.id, Number(amt), Number(semiAmt), policy.is_active); setEditing(false); };

    return (
        <tr className="border-b border-white/5 hover:bg-white/[0.02] focus-visible:bg-white/[0.02]">
            <td className="px-4 py-3 text-sm text-zinc-300">{policy.label}</td>
            <td className="px-4 py-3 text-xs text-zinc-400">{getTargetLabel(policy.target)}</td>
            <td className="px-4 py-3"><PolicyAmountCell editing={editing} amt={amt} setAmt={setAmt} displayAmount={policy.amount} /></td>
            <td className="px-4 py-3"><PolicyAmountCell editing={editing} amt={semiAmt} setAmt={setSemiAmt} displayAmount={policy.semi_amount ?? 0} /></td>
            <td className="px-4 py-3 text-xs text-zinc-400">{policy.daily_limit ? `${policy.daily_limit}회/일` : "무제한"}</td>
            <td className="px-4 py-3">
                <button type="button" className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${policy.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"}`} onClick={() => void onUpdate(policy.id, policy.amount, policy.semi_amount, !policy.is_active)}>
                    {policy.is_active ? "활성" : "비활성"}
                </button>
            </td>
            <td className="px-4 py-3">
                {editing
                    ? <button type="button" className="text-xs text-emerald-400 hover:underline focus-visible:underline focus-visible:outline-none" onClick={() => void save()}>저장</button>
                    : <button type="button" className="text-xs text-purple-400 hover:underline focus-visible:underline focus-visible:outline-none" onClick={() => setEditing(true)}>수정</button>}
            </td>
        </tr>
    );
}

// ─── Policy Section ──────────────────────────────────────

export default function PolicySection({ policies, onUpdate }: Readonly<{
    policies: PolicyItem[];
    onUpdate: (id: string, amount: number, semiAmount: number | null, isActive: boolean) => Promise<void>;
}>): React.ReactElement {
    return (
        <section>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-cyan-400">
                <Settings className="h-4 w-4" /> 포인트 정책 설정
            </h2>
            <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5 text-xs text-zinc-400">
                            <th className="px-4 py-3 font-medium">활동</th>
                            <th className="px-4 py-3 font-medium">대상</th>
                            <th className="px-4 py-3 font-medium">기본 포인트</th>
                            <th className="px-4 py-3 font-medium">반영구 포인트</th>
                            <th className="px-4 py-3 font-medium">일일 제한</th>
                            <th className="px-4 py-3 font-medium">상태</th>
                            <th className="px-4 py-3 font-medium" />
                        </tr>
                    </thead>
                    <tbody>
                        {policies.map((p) => (
                            <PolicyRow key={p.id} policy={p} onUpdate={onUpdate} />
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
