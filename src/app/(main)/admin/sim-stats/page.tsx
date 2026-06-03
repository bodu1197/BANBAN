// @client-reason: useAuth() 로 관리자 인증 상태를 클라이언트에서 확인한 뒤에야 통계를 조회 — 클라이언트 전용 인증 게이트
"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminLoadingSpinner, AdminErrorState, AdminPageHeader } from "@/components/admin/admin-shared";

export default function AdminSimStatsPage(): React.ReactElement {
    const { user, isLoading: authLoading } = useAuth();
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // @client-reason: useAuth(클라이언트 전용 인증 훅)가 user 를 해석한 뒤에만 페칭 — authLoading/user 게이트에 의존하므로 서버컴포넌트로 옮길 수 없음
    useEffect(() => {
        if (authLoading || !user) return;
        let active = true;
        fetch("/api/admin/sim-stats")
            .then((res) => {
                if (!res.ok) throw new Error("데이터를 불러올 수 없습니다.");
                return res.json();
            })
            .then((json: { total: number }) => { if (active) setTotal(json.total); })
            .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "오류"); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [authLoading, user]);

    if (authLoading || loading) return <AdminLoadingSpinner accentColor="purple" />;
    if (error) return <AdminErrorState message={error} />;

    return (
        <div className="min-h-full p-6">
            <AdminPageHeader title="시뮬레이션 통계" />
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    총 사용 횟수
                </div>
                <p className="mt-2 text-4xl font-bold text-white">{total.toLocaleString()}</p>
            </div>
        </div>
    );
}
