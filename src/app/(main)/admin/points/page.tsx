// @client-reason: Admin point management with search, grant/deduct actions, policy editing
"use client";

import { useAuth } from "@/hooks/useAuth";
import { AdminLoadingSpinner, AdminErrorState, AdminPageHeader } from "@/components/admin/admin-shared";
import type { AdminPointData } from "./points-types";
import { API_PATH, JSON_HEADERS } from "./points-types";
import StatsSection from "./points-stats";
import GrantDeductForm from "./points-grant-form";
import PolicySection from "./points-policy";
import TransactionSection from "./points-transactions";
import { useAdminPoints } from "./use-admin-points";

// ─── Dashboard Content ──────────────────────────────────

function DashboardContent({ data, search, page, onSearch, onPageChange, onReload }: Readonly<{
    data: AdminPointData;
    search: string;
    page: number;
    onSearch: (s: string) => void;
    onPageChange: (p: number) => void;
    onReload: () => void;
}>): React.ReactElement {
    const handleAction = async (userId: string, amount: number, desc: string, isGrant: boolean): Promise<void> => {
        const res = await fetch(API_PATH, {
            method: isGrant ? "POST" : "DELETE",
            headers: JSON_HEADERS,
            body: JSON.stringify({ userId, amount, description: desc }),
        });
        if (!res.ok) {
            const err = await res.json() as { error: string };
            throw new Error(err.error);
        }
        onReload();
    };

    const handlePolicyUpdate = async (id: string, amount: number, semiAmount: number | null, isActive: boolean): Promise<void> => {
        await fetch(API_PATH, {
            method: "PATCH",
            headers: JSON_HEADERS,
            body: JSON.stringify({ id, amount, semi_amount: semiAmount, is_active: isActive }),
        });
        onReload();
    };

    return (
        <div className="h-full p-6 pb-20">
            <div className="mb-6">
                <AdminPageHeader title="포인트 관리" />
            </div>
            <div className="space-y-8">
                <StatsSection stats={data.stats} />
                <GrantDeductForm onAction={handleAction} />
                <PolicySection policies={data.policies} onUpdate={handlePolicyUpdate} />
                <TransactionSection
                    transactions={data.transactions}
                    total={data.total}
                    search={search}
                    onSearch={onSearch}
                    page={page}
                    onPageChange={onPageChange}
                />
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────

export default function AdminPointsPage(): React.ReactElement {
    const { user, isLoading: authLoading } = useAuth();
    const { data, loading, error, search, page, setSearch, setPage, reload } = useAdminPoints(authLoading, user);

    if (authLoading || loading) return <AdminLoadingSpinner accentColor="purple" />;
    if (error) return <AdminErrorState message={error} />;
    if (!data) return <AdminLoadingSpinner accentColor="purple" />;

    return (
        <DashboardContent
            data={data}
            search={search}
            page={page}
            onSearch={(s) => { setSearch(s); setPage(1); }}
            onPageChange={setPage}
            onReload={reload}
        />
    );
}
