// @client-reason: Transaction history table with search and pagination
"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { TransactionItem } from "./points-types";
import { getReasonLabel } from "./points-types";

// ─── Transaction Row ─────────────────────────────────────

function TransactionRow({ tx }: Readonly<{ tx: TransactionItem }>): React.ReactElement {
    const profile = tx.point_wallets?.profiles;
    const name = profile?.nickname ?? profile?.username ?? "Unknown";
    const isPositive = tx.amount > 0;

    return (
        <tr className="border-b border-white/5 hover:bg-white/[0.02] focus-visible:bg-white/[0.02]">
            <td className="px-4 py-3 text-xs text-zinc-500">
                {new Date(tx.created_at).toLocaleDateString("ko-KR")}
            </td>
            <td className="px-4 py-3 text-sm text-zinc-300">{name}</td>
            <td className="px-4 py-3">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-zinc-400">
                    {getReasonLabel(tx.reason)}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-zinc-400">{tx.description ?? "-"}</td>
            <td className={`px-4 py-3 text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                {isPositive ? "+" : ""}{tx.amount.toLocaleString()}P
            </td>
        </tr>
    );
}

// ─── Search Bar ──────────────────────────────────────────

function TxSearchBar({ search, onSearch }: Readonly<{ search: string; onSearch: (q: string) => void }>): React.ReactElement {
    const [input, setInput] = useState(search);
    return (
        <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSearch(input); }} placeholder="회원 검색 (username / nickname)" className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none" />
            </div>
            <button type="button" className="shrink-0 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-purple-700" onClick={() => onSearch(input)}>검색</button>
        </div>
    );
}

// ─── Pagination ──────────────────────────────────────────

function TxPagination({ page, totalPages, onPageChange }: Readonly<{ page: number; totalPages: number; onPageChange: (p: number) => void }>): React.ReactElement | null {
    if (totalPages <= 1) return null;
    return (
        <div className="mt-3 flex items-center justify-center gap-2">
            <button type="button" disabled={page <= 1} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white disabled:opacity-30 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onPageChange(page - 1)}>이전</button>
            <span className="text-sm text-zinc-400">{page} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white disabled:opacity-30 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onPageChange(page + 1)}>다음</button>
        </div>
    );
}

// ─── Transaction Section ─────────────────────────────────

export default function TransactionSection({ transactions, total, search, onSearch, page, onPageChange }: Readonly<{
    transactions: TransactionItem[];
    total: number;
    search: string;
    onSearch: (q: string) => void;
    page: number;
    onPageChange: (p: number) => void;
}>): React.ReactElement {
    return (
        <section>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-300">전체 거래 내역 ({total.toLocaleString()}건)</h2>
            <TxSearchBar search={search} onSearch={onSearch} />
            <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5 text-xs text-zinc-400">
                            <th className="px-4 py-3 font-medium">일시</th>
                            <th className="px-4 py-3 font-medium">회원</th>
                            <th className="px-4 py-3 font-medium">유형</th>
                            <th className="px-4 py-3 font-medium">사유</th>
                            <th className="px-4 py-3 font-medium">금액</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">거래 내역이 없습니다</td></tr>
                        ) : null}
                        {transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
                    </tbody>
                </table>
            </div>
            <TxPagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={onPageChange} />
        </section>
    );
}
