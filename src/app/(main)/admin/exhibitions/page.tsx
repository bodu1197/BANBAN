// @client-reason: Admin exhibition management with image upload, category filter, and CRUD
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminLoadingSpinner, AdminPageHeader } from "@/components/admin/admin-shared";
import type { ExhibitionItem } from "./exhibition-types";
import { EMPTY_FORM, CATEGORIES, itemToForm } from "./exhibition-types";
import ExhibitionForm from "./exhibition-form";
import ExhibitionRow from "./exhibition-row";
import { useExhibitions, useExhibitionActions } from "./use-exhibitions";
import type { ExhibitionActions } from "./use-exhibitions";

// ─── Category Tabs ───────────────────────────────────────

function CategoryTabs({ active, onChange }: Readonly<{
    active: string; onChange: (v: string) => void;
}>): React.ReactElement {
    const tabs = [{ value: "ALL", label: "전체" }, ...CATEGORIES];
    return (
        <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
                <button key={t.value} type="button" onClick={() => onChange(t.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        active === t.value ? "bg-orange-500 text-white" : "bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white"
                    }`}>
                    {t.label}
                </button>
            ))}
        </div>
    );
}

// ─── Empty State ─────────────────────────────────────────

function EmptyState(): React.ReactElement {
    return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-16 text-zinc-500">
            <p className="text-sm">등록된 기획전이 없습니다</p>
            <p className="text-xs">&quot;기획전 추가&quot; 버튼을 클릭하여 만들어보세요</p>
        </div>
    );
}

// ─── Exhibition List ─────────────────────────────────────

function ExhibitionList({ items, actions }: Readonly<{
    items: ExhibitionItem[];
    actions: ExhibitionActions;
}>): React.ReactElement {
    return (
        <section className="space-y-3">
            {items.length === 0 ? <EmptyState /> : null}
            {items.map((item, i) => (
                <ExhibitionRow
                    key={item.id}
                    item={item}
                    onEdit={() => { actions.setEditingId(item.id); actions.setShowCreate(false); }}
                    onDelete={() => actions.handleDelete(item.id)}
                    onToggle={() => actions.handleToggle(item)}
                    onMove={(dir) => actions.handleMove(i, dir)}
                    isFirst={i === 0}
                    isLast={i === items.length - 1}
                />
            ))}
        </section>
    );
}

// ─── Main Page ───────────────────────────────────────────

export default function ExhibitionsAdminPage(): React.ReactElement {
    const { isLoading: authLoading } = useAuth();
    const { items, loading, reload } = useExhibitions(authLoading);
    const actions = useExhibitionActions(items, reload);
    const [filterCategory, setFilterCategory] = useState("ALL");

    if (authLoading || loading) return <AdminLoadingSpinner accentColor="orange" />;

    const editingItem = actions.editingId ? items.find((b) => b.id === actions.editingId) : null;
    const filtered = filterCategory === "ALL" ? items : items.filter((i) => i.category === filterCategory);

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="flex items-center justify-between">
                <AdminPageHeader title="기획전 배너 관리" count={items.length} countLabel="개" />
                <button type="button" onClick={() => { actions.setShowCreate(true); actions.setEditingId(null); }}
                    className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Plus className="h-4 w-4" /> 기획전 추가
                </button>
            </div>

            {actions.showCreate ? (
                <section>
                    <h2 className="mb-3 text-sm font-bold text-zinc-300">새 기획전 만들기</h2>
                    <ExhibitionForm initial={EMPTY_FORM} onSave={actions.handleCreate} onCancel={() => actions.setShowCreate(false)} saving={actions.saving} />
                </section>
            ) : null}

            {editingItem ? (
                <section>
                    <h2 className="mb-3 text-sm font-bold text-zinc-300">기획전 수정</h2>
                    <ExhibitionForm initial={itemToForm(editingItem)} onSave={actions.handleUpdate} onCancel={() => actions.setEditingId(null)} saving={actions.saving} />
                </section>
            ) : null}

            <CategoryTabs active={filterCategory} onChange={setFilterCategory} />
            <ExhibitionList items={filtered} actions={actions} />
        </div>
    );
}
