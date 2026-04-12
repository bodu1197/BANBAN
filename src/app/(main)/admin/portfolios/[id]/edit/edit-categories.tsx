// @client-reason: Category selection UI with hierarchical gender-based grouping
"use client";

import { useState } from "react";
import { getCategoryDisplayName } from "@/types/portfolio-search";
import type { CategoryItem } from "@/types/portfolio-search";

// ─── CategoryCheckboxGroup ──────────────────────────────

function CategoryCheckboxGroup({ label, items, selected, onToggle }: Readonly<{
    label: string;
    items: CategoryItem[];
    selected: Set<string>;
    onToggle: (id: string) => void;
}>): React.ReactElement | null {
    if (items.length === 0) return null;
    return (
        <div className="mb-3">
            <p className="mb-2 text-xs font-semibold text-zinc-400">{label}</p>
            <div className="flex flex-wrap gap-2">
                {items.map((cat) => (
                    <label key={cat.id} className="flex cursor-pointer items-center gap-1.5">
                        <input type="checkbox" checked={selected.has(cat.id)} onChange={() => onToggle(cat.id)} className="rounded border-white/20 bg-white/5" />
                        <span className="text-sm text-zinc-300">{getCategoryDisplayName(cat)}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

// ─── Helpers for single-select parent logic ─────────────

function collectParentAndChildren(parentId: string, allCategories: CategoryItem[]): string[] {
    return [parentId, ...allCategories.filter((c) => c.parentId === parentId).map((c) => c.id)];
}

function buildRemovalSet(parentIds: Set<string>, keepId: string, allCategories: CategoryItem[]): Set<string> {
    const toRemove = new Set<string>();
    for (const pid of parentIds) {
        if (pid === keepId) continue;
        for (const id of collectParentAndChildren(pid, allCategories)) toRemove.add(id);
    }
    return toRemove;
}

// ─── Gender Category Group ──────────────────────────────

function AdminParentButtonRow({ parents, selected, onParentSelect }: Readonly<{
    parents: CategoryItem[];
    selected: Set<string>;
    onParentSelect: (id: string) => void;
}>): React.ReactElement {
    return (
        <div className="flex flex-wrap gap-2">
            {parents.map((cat) => {
                const isSelected = selected.has(cat.id);
                const btnStyle = isSelected
                    ? "bg-purple-500 text-white border-purple-500"
                    : "bg-white/5 text-zinc-300 border-white/10 hover:border-purple-400 focus-visible:border-purple-400";
                return (
                    <button key={cat.id} type="button" onClick={() => onParentSelect(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${btnStyle}`}>
                        {getCategoryDisplayName(cat)}
                    </button>
                );
            })}
        </div>
    );
}

function handleParentClick(
    parentId: string, selected: Set<string>, parentIds: Set<string>,
    allCategories: CategoryItem[], setActive: (id: string | null) => void,
    onSelectionChange: (s: Set<string>) => void,
): void {
    if (selected.has(parentId)) {
        setActive(null);
        const toRemove = new Set(collectParentAndChildren(parentId, allCategories));
        onSelectionChange(new Set([...selected].filter((id) => !toRemove.has(id))));
    } else {
        setActive(parentId);
        const toRemove = buildRemovalSet(parentIds, parentId, allCategories);
        const filtered = [...selected].filter((id) => !toRemove.has(id));
        onSelectionChange(new Set([...filtered, parentId]));
    }
}

function handleChildToggle(
    childId: string, selected: Set<string>, activeParent: string | null,
    onSelectionChange: (s: Set<string>) => void,
): void {
    const next = new Set(selected);
    if (next.has(childId)) {
        next.delete(childId);
    } else {
        next.add(childId);
        if (activeParent && !next.has(activeParent)) next.add(activeParent);
    }
    onSelectionChange(next);
}

function ChildCheckboxList({ items, selected, activeParent, onSelectionChange }: Readonly<{
    items: CategoryItem[]; selected: Set<string>; activeParent: string | null;
    onSelectionChange: (s: Set<string>) => void;
}>): React.ReactElement {
    return (
        <div className="rounded-md bg-white/5 p-3">
            <p className="text-xs font-semibold mb-2 text-zinc-500">하위 기법</p>
            <div className="flex flex-wrap gap-2">
                {items.map((cat) => (
                    <label key={cat.id} className="flex cursor-pointer items-center gap-1.5">
                        <input type="checkbox" checked={selected.has(cat.id)} onChange={() => handleChildToggle(cat.id, selected, activeParent, onSelectionChange)} className="rounded border-white/20 bg-white/5" />
                        <span className="text-sm text-zinc-300">{getCategoryDisplayName(cat)}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

function AdminGenderGroup({ label, parents, allCategories, selected, onSelectionChange }: Readonly<{
    label: string;
    parents: CategoryItem[];
    allCategories: CategoryItem[];
    selected: Set<string>;
    onSelectionChange: (newSet: Set<string>) => void;
}>): React.ReactElement {
    const parentIds = new Set(parents.map((p) => p.id));
    const initialActive = parents.find((p) => selected.has(p.id))?.id ?? null;
    const [activeParent, setActiveParent] = useState<string | null>(initialActive);
    const children = activeParent ? allCategories.filter((c) => c.type === "SKILL" && c.parentId === activeParent) : [];

    return (
        <div className="rounded-lg border border-white/10 p-3 space-y-2">
            <p className="text-xs font-semibold text-zinc-400">{label}</p>
            <AdminParentButtonRow parents={parents} selected={selected} onParentSelect={(pid) => handleParentClick(pid, selected, parentIds, allCategories, setActiveParent, onSelectionChange)} />
            {activeParent && children.length > 0 && (
                <ChildCheckboxList items={children} selected={selected} activeParent={activeParent} onSelectionChange={onSelectionChange} />
            )}
        </div>
    );
}

// ─── Hierarchical Selector ──────────────────────────────

function distributeSelected(selected: Set<string>, categories: CategoryItem[], maleParentIds: Set<string>, femaleParentIds: Set<string>): { male: Set<string>; female: Set<string> } {
    const male = new Set<string>();
    const female = new Set<string>();
    for (const id of selected) {
        const cat = categories.find((c) => c.id === id);
        if (!cat) continue;
        const parentId = cat.parentId ?? cat.id;
        if (maleParentIds.has(parentId) || maleParentIds.has(cat.id)) male.add(id);
        if (femaleParentIds.has(parentId) || femaleParentIds.has(cat.id)) female.add(id);
    }
    return { male, female };
}

function AdminHierarchicalSelector({ categories, initialSelected, onSelectionChange }: Readonly<{
    categories: CategoryItem[];
    initialSelected: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
}>): React.ReactElement {
    const allParents = categories.filter((c) => c.type === "GENRE");
    const maleParents = allParents.filter((c) => c.targetGender === "MALE");
    const femaleParents = allParents.filter((c) => c.targetGender === "FEMALE");
    const maleParentIds = new Set(maleParents.map((c) => c.id));
    const femaleParentIds = new Set(femaleParents.map((c) => c.id));

    const initial = distributeSelected(initialSelected, categories, maleParentIds, femaleParentIds);
    const [selections, setSelections] = useState({ male: initial.male, female: initial.female });

    function maleSetSelection(newSet: Set<string>): void {
        setSelections((prev) => {
            onSelectionChange(new Set([...newSet, ...prev.female]));
            return { male: newSet, female: prev.female };
        });
    }
    function femaleSetSelection(newSet: Set<string>): void {
        setSelections((prev) => {
            onSelectionChange(new Set([...prev.male, ...newSet]));
            return { male: prev.male, female: newSet };
        });
    }

    return (
        <div className="space-y-3">
            <AdminGenderGroup label="남성 뷰티" parents={maleParents} allCategories={categories} selected={selections.male} onSelectionChange={maleSetSelection} />
            <AdminGenderGroup label="여성 뷰티" parents={femaleParents} allCategories={categories} selected={selections.female} onSelectionChange={femaleSetSelection} />
        </div>
    );
}

// ─── CategoriesSection (main export) ─────────────────────

export default function CategoriesSection({ categories, selected, onToggle, isSemiPermanent, onSelectionChange }: Readonly<{
    categories: CategoryItem[];
    selected: Set<string>;
    onToggle: (id: string) => void;
    isSemiPermanent: boolean;
    onSelectionChange: (ids: Set<string>) => void;
}>): React.ReactElement {
    if (isSemiPermanent) {
        return (
            <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">카테고리</label>
                <AdminHierarchicalSelector categories={categories} initialSelected={selected} onSelectionChange={onSelectionChange} />
            </div>
        );
    }
    const genre = categories.filter((c) => c.type === "GENRE");
    const subject = categories.filter((c) => c.type === "SUBJECT");
    const part = categories.filter((c) => c.type === "PART");
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">카테고리</label>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <CategoryCheckboxGroup label="장르" items={genre} selected={selected} onToggle={onToggle} />
                <CategoryCheckboxGroup label="주제" items={subject} selected={selected} onToggle={onToggle} />
                <CategoryCheckboxGroup label="부위" items={part} selected={selected} onToggle={onToggle} />
            </div>
        </div>
    );
}
