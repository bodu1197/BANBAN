// @client-reason: Grant/deduct form with user ID, amount, and description inputs
"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const INPUT_CLS = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none";
const GRANT_BTN = "inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-emerald-700 disabled:opacity-50";
const DEDUCT_BTN = "inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-red-700 disabled:opacity-50";

function useGrantForm(onAction: (userId: string, amount: number, desc: string, isGrant: boolean) => Promise<void>): {
    userId: string; setUserId: (v: string) => void;
    amount: string; setAmount: (v: string) => void;
    desc: string; setDesc: (v: string) => void;
    busy: boolean; msg: string | null;
    handleSubmit: (isGrant: boolean) => Promise<void>;
} {
    const [userId, setUserId] = useState("");
    const [amount, setAmount] = useState("");
    const [desc, setDesc] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const handleSubmit = async (isGrant: boolean): Promise<void> => {
        if (!userId || !amount || !desc) { setMsg("모든 필드를 입력해주세요"); return; }
        const num = Number(amount);
        if (num <= 0) { setMsg("금액은 0보다 커야 합니다"); return; }
        setBusy(true);
        setMsg(null);
        try {
            await onAction(userId, num, desc, isGrant);
            setMsg(isGrant ? `${num.toLocaleString()}P 지급 완료` : `${num.toLocaleString()}P 회수 완료`);
            setAmount("");
            setDesc("");
        } catch (e) {
            setMsg(e instanceof Error ? e.message : "오류 발생");
        } finally {
            setBusy(false);
        }
    };

    return { userId, setUserId, amount, setAmount, desc, setDesc, busy, msg, handleSubmit };
}

export default function GrantDeductForm({ onAction }: Readonly<{
    onAction: (userId: string, amount: number, desc: string, isGrant: boolean) => Promise<void>;
}>): React.ReactElement {
    const { userId, setUserId, amount, setAmount, desc, setDesc, busy, msg, handleSubmit } = useGrantForm(onAction);

    return (
        <section>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-400">
                <Plus className="h-4 w-4" /> 포인트 지급 / 회수
            </h2>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                        <label className="mb-1 block text-xs text-zinc-400">회원 ID / 닉네임 / 유저네임</label>
                        <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="UUID 또는 닉네임" className={INPUT_CLS} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-zinc-400">포인트</label>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000" min="1" className={INPUT_CLS} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-zinc-400">사유</label>
                        <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="이벤트 보상 등" className={INPUT_CLS} />
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                    <button type="button" disabled={busy} className={GRANT_BTN} onClick={() => void handleSubmit(true)}>
                        <Plus className="h-4 w-4" /> 지급
                    </button>
                    <button type="button" disabled={busy} className={DEDUCT_BTN} onClick={() => void handleSubmit(false)}>
                        <Minus className="h-4 w-4" /> 회수
                    </button>
                    {msg ? <span className="text-sm text-zinc-300">{msg}</span> : null}
                </div>
            </div>
        </section>
    );
}
