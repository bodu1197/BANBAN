// @client-reason: Admin portfolio edit form with state management and API calls
"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminLoadingSpinner, AdminErrorState } from "@/components/admin/admin-shared";
import type { CategoryItem } from "@/types/portfolio-search";
import type { PortfolioData, MediaItem, PortfolioForm } from "./edit-types";
import { usePortfolioDetail, useCategories } from "./edit-hooks";
import CategoriesSection from "./edit-categories";
import { FormFields, MediaGrid } from "./edit-form-fields";

// ─── Edit Header ─────────────────────────────────────────

function EditHeader({ portfolio, saving, onBack, onSave }: Readonly<{
    portfolio: PortfolioData; saving: boolean; onBack: () => void; onSave: () => void;
}>): React.ReactElement {
    return (
        <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button type="button" onClick={onBack} aria-label="목록으로" className="rounded-lg p-2 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/10">
                    <ArrowLeft className="h-5 w-5 text-zinc-400" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-white">포트폴리오 수정</h1>
                    <p className="text-xs text-zinc-500">{portfolio.artist?.title ?? "아티스트 없음"} · ID: {portfolio.id.slice(0, 8)}</p>
                </div>
            </div>
            <button type="button" disabled={saving} onClick={onSave}
                className="flex items-center gap-2 rounded-lg bg-purple-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-purple-600 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "저장중..." : "저장"}
            </button>
        </div>
    );
}

// ─── Save helper ─────────────────────────────────────────

async function savePortfolio(
    portfolioId: string, form: PortfolioForm, selectedCats: Set<string>, deletedMediaIds: Set<string>,
): Promise<boolean> {
    const priceNum = Number(form.price) || 0;
    const priceOriginNum = Number(form.priceOrigin) || priceNum;
    const discountRate = priceOriginNum > 0 ? Math.round(((priceOriginNum - priceNum) / priceOriginNum) * 100) : 0;
    const res = await fetch(`/api/admin/portfolios/${portfolioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: form.title, description: form.description, price: priceNum,
            price_origin: priceOriginNum, discount_rate: Math.max(0, discountRate),
            sale_ended_at: form.saleEndedAt || null,
            categoryIds: Array.from(selectedCats), deletedMediaIds: Array.from(deletedMediaIds),
        }),
    });
    return res.ok;
}

// ─── EditPageContent ────────────────────────────────────

function EditPageContent({ portfolio, media, initialCategoryIds, categories }: Readonly<{
    portfolio: PortfolioData; media: MediaItem[]; initialCategoryIds: string[]; categories: CategoryItem[];
}>): React.ReactElement {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<PortfolioForm>({
        title: portfolio.title, description: portfolio.description,
        price: String(portfolio.price), priceOrigin: String(portfolio.price_origin),
        saleEndedAt: portfolio.sale_ended_at?.slice(0, 10) ?? "",
    });
    const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(initialCategoryIds));
    const [deletedMediaIds, setDeletedMediaIds] = useState<Set<string>>(new Set());
    const isSemiPermanent = portfolio.artist?.type_artist === "SEMI_PERMANENT";

    const toggleCat = useCallback((id: string) => {
        setSelectedCats((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try { if (await savePortfolio(portfolio.id, form, selectedCats, deletedMediaIds)) { globalThis.alert("저장되었습니다."); router.push("/admin/portfolios"); } }
        finally { setSaving(false); }
    }, [portfolio.id, form, selectedCats, deletedMediaIds, router]);

    return (
        <div className="h-full overflow-y-auto p-6 pb-20">
            <EditHeader portfolio={portfolio} saving={saving} onBack={() => router.push("/admin/portfolios")} onSave={() => void handleSave()} />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <FormFields form={form} setForm={setForm} />
                    <CategoriesSection categories={categories} selected={selectedCats} onToggle={toggleCat} isSemiPermanent={isSemiPermanent} onSelectionChange={setSelectedCats} />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">이미지 ({media.filter((m) => !deletedMediaIds.has(m.id)).length}장)</label>
                    <MediaGrid media={media} deletedIds={deletedMediaIds} onDelete={(id) => setDeletedMediaIds((prev) => new Set([...prev, id]))} />
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────

export default function AdminPortfolioEditPage(): React.ReactElement {
    const { user, isLoading: authLoading } = useAuth();
    const params = useParams<{ id: string }>();
    const id = params.id;
    const { portfolio, media, categoryIds, loading, error } = usePortfolioDetail(id, authLoading, user);
    const categories = useCategories(portfolio?.artist?.type_artist);

    if (authLoading || loading) return <AdminLoadingSpinner accentColor="purple" />;
    if (error) return <AdminErrorState message={error} />;
    if (!portfolio) return <AdminErrorState message="포트폴리오를 찾을 수 없습니다." />;

    return <EditPageContent portfolio={portfolio} media={media} initialCategoryIds={categoryIds} categories={categories} />;
}
