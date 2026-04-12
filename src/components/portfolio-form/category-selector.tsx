// @client-reason: Category selection with interactive checkboxes and toggle state
"use client";
/* eslint-disable max-lines-per-function */

import { useState } from "react";
import { getCategoryDisplayName } from "@/types/portfolio-search";
import type { CategoryItem } from "@/types/portfolio-search";

// --- Helpers for single-select parent logic ---

function collectParentAndChildren(parentId: string, allCategories: CategoryItem[]): string[] {
    return [parentId, ...allCategories.filter((c) => c.parentId === parentId).map((c) => c.id)];
}

// --- Category Radio Group (Tattoo: single-select per type) ---

export function CategoryGroup({
    label, items, selected, onChange,
}: Readonly<{
    label: string;
    items: CategoryItem[];
    selected: Set<string>;
        onChange: (id: string) => void;
}>): React.ReactElement | null {
    if (items.length === 0) return null;
    const groupName = `cat-${items[0]?.type ?? "unknown"}`;
    const selectedId = items.find((c) => selected.has(c.id))?.id ?? "";
    return (
        <div className="mb-4">
            <p className="text-sm font-semibold mb-2 text-foreground">{label}</p>
            <div className="flex flex-wrap gap-2">
                {items.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="radio"
                            name={groupName}
                            checked={selectedId === cat.id}
                            onChange={(): void => onChange(cat.id)}
                            className="border-border"
                        />
                        <span className="text-sm">{getCategoryDisplayName(cat)}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

// --- Skill Children (radio single-select) ---

function SkillChildren({ parentId, skills, selectedChild, onSelect }: Readonly<{
    parentId: string;
    skills: CategoryItem[];
    selectedChild: string | null;
        onSelect: (parentId: string, childId: string | null) => void;
}>): React.ReactElement | null {
    if (skills.length === 0) return <p className="text-xs text-muted-foreground">하위 기법이 없습니다.</p>;
    return (
        <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs font-semibold mb-2 text-muted-foreground">하위 기법 (1개 선택)</p>
            <div className="flex flex-wrap gap-2">
                {skills.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name={`skill-${parentId}`} checked={selectedChild === cat.id} onChange={(): void => onSelect(parentId, cat.id)} className="border-border" />
                        <span className="text-sm">{getCategoryDisplayName(cat)}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

// --- Gender Category Group (single-select parent + single-select child) ---

function GenderCategoryGroup({
    label, parents, allCategories, selected, disabled, onSelect,
}: Readonly<{
    label: string;
    parents: CategoryItem[];
    allCategories: CategoryItem[];
    selected: Set<string>;
        disabled: boolean;
    onSelect: (parentId: string, childId: string | null) => void;
}>): React.ReactElement {
    const activeParent = parents.find((p) => selected.has(p.id))?.id ?? null;
    const children = activeParent ? allCategories.filter((c) => c.type === "SKILL" && c.parentId === activeParent) : [];
    const selectedChild = children.find((c) => selected.has(c.id))?.id ?? null;
    const wrapperStyle = disabled ? "opacity-40 pointer-events-none border-border/50" : "border-border";

    return (
        <div className={`rounded-md border p-3 space-y-2 transition-opacity ${wrapperStyle}`}>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <div className="flex flex-wrap gap-2">
                {parents.map((cat) => {
                    const btnStyle = activeParent === cat.id
                        ? "bg-brand-primary text-white border-brand-primary"
                        : "bg-muted text-foreground border-border hover:border-brand-primary focus-visible:border-brand-primary";
                    return (
                        <button key={cat.id} type="button" onClick={(): void => onSelect(cat.id, null)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${btnStyle}`}>
                            {getCategoryDisplayName(cat)}
                        </button>
                    );
                })}
            </div>
            {activeParent && <SkillChildren parentId={activeParent} skills={children} selectedChild={selectedChild} onSelect={onSelect} />}
        </div>
    );
}

// --- Exclusive Gender Category Selector (one gender only, single-select) ---

export function HierarchicalCategorySelector({
    categories, initialSelected, onSelectionChange,
}: Readonly<{
    categories: CategoryItem[];
    initialSelected: Set<string>;
        onSelectionChange: (ids: Set<string>) => void;
}>): React.ReactElement {
    const allParents = categories.filter((c) => c.type === "GENRE");
    const maleParents = allParents.filter((c) => c.targetGender === "MALE");
    const femaleParents = allParents.filter((c) => c.targetGender === "FEMALE");
    const maleIds = new Set(maleParents.flatMap((p) => collectParentAndChildren(p.id, categories)));
    const femaleIds = new Set(femaleParents.flatMap((p) => collectParentAndChildren(p.id, categories)));
    const hasMale = [...initialSelected].some((id) => maleIds.has(id));
    const hasFemale = [...initialSelected].some((id) => femaleIds.has(id));
    function detectInitialGender(): "MALE" | "FEMALE" | null {
        if (hasMale) return "MALE";
        if (hasFemale) return "FEMALE";
        return null;
    }
    const [activeGender, setActiveGender] = useState<"MALE" | "FEMALE" | null>(detectInitialGender);

    function handleSelect(gender: "MALE" | "FEMALE", parentId: string, childId: string | null): void {
        setActiveGender(gender);
        const newSet = new Set<string>();
        newSet.add(parentId);
        if (childId) newSet.add(childId);
        onSelectionChange(newSet);
    }

    return (
        <div className="space-y-4">
            <GenderCategoryGroup
                label="남성 뷰티"
                parents={maleParents}
                allCategories={categories}
                selected={activeGender === "MALE" ? initialSelected : new Set()}
                disabled={activeGender === "FEMALE"}
                onSelect={(pid, cid): void => handleSelect("MALE", pid, cid)}
            />
            <GenderCategoryGroup
                label="여성 뷰티"
                parents={femaleParents}
                allCategories={categories}
                selected={activeGender === "FEMALE" ? initialSelected : new Set()}
                disabled={activeGender === "MALE"}
                onSelect={(pid, cid): void => handleSelect("FEMALE", pid, cid)}
            />
            {activeGender && (
                <button
                    type="button"
                    onClick={(): void => { setActiveGender(null); onSelectionChange(new Set()); }}
                    className="text-xs text-muted-foreground underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    선택 초기화
                </button>
            )}
        </div>
    );
}

// --- Combined Category Section (renders appropriate selector based on artist type) ---

export function CategorySection({
    categories, selectedCategories, isSemiPermanent, onSelectionChange, onSelectCategory,
}: Readonly<{
    categories: CategoryItem[];
    selectedCategories: Set<string>;
    isSemiPermanent: boolean;
        onSelectionChange: (ids: Set<string>) => void;
    onSelectCategory: (id: string) => void;
}>): React.ReactElement {
    const genreCategories = categories.filter((c) => c.type === "GENRE");
    const subjectCategories = categories.filter((c) => c.type === "SUBJECT");
    const partCategories = categories.filter((c) => c.type === "PART");

    return (
        <div>
            <label className="block text-sm font-medium mb-1.5">대표 분류 <span className="text-destructive">*</span></label>
            <div className="rounded-md border border-border p-4 space-y-2">
                {isSemiPermanent ? (
                    <HierarchicalCategorySelector
                        categories={categories}
                        initialSelected={selectedCategories}
                        onSelectionChange={onSelectionChange}
                    />
                ) : (
                    <>
                        <CategoryGroup label="장르" items={genreCategories} selected={selectedCategories} onChange={onSelectCategory} />
                        <CategoryGroup label="주제" items={subjectCategories} selected={selectedCategories} onChange={onSelectCategory} />
                        <CategoryGroup label="부위" items={partCategories} selected={selectedCategories} onChange={onSelectCategory} />
                    </>
                )}
            </div>
        </div>
    );
}
