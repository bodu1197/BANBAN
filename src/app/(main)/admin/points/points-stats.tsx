// @client-reason: Point stats display cards
"use client";

import { Coins, TrendingUp, Users, Wallet } from "lucide-react";
import type { PointStats } from "./points-types";

function StatCard({ icon, label, value }: Readonly<{
    icon: React.ReactElement;
    label: string;
    value: string;
}>): React.ReactElement {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-zinc-400">
                {icon} {label}
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
}

export default function StatsSection({ stats }: Readonly<{ stats: PointStats }>): React.ReactElement {
    return (
        <section>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-purple-400">
                <Coins className="h-4 w-4" /> 포인트 현황
            </h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard icon={<Wallet className="h-3.5 w-3.5 text-amber-400" />} label="총 보유" value={`${stats.totalBalance.toLocaleString()}P`} />
                <StatCard icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />} label="총 지급" value={`${stats.totalEarned.toLocaleString()}P`} />
                <StatCard icon={<Coins className="h-3.5 w-3.5 text-blue-400" />} label="총 사용" value={`${stats.totalSpent.toLocaleString()}P`} />
                <StatCard icon={<Users className="h-3.5 w-3.5 text-purple-400" />} label="보유 회원" value={`${stats.walletCount}명`} />
            </div>
        </section>
    );
}
