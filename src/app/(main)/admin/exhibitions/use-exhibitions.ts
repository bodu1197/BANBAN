// @client-reason: React hooks for exhibition data fetching and CRUD actions
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ExhibitionItem, ExhibitionFormData } from "./exhibition-types";
import { API_PATH, apiFetch, formToPayload } from "./exhibition-types";

// ─── Data loading ────────────────────────────────────────

async function loadExhibitions(): Promise<ExhibitionItem[]> {
    const res = await fetch(API_PATH);
    const json = await res.json() as { exhibitions: ExhibitionItem[] };
    return json.exhibitions ?? [];
}

export function useExhibitions(authLoading: boolean): {
    items: ExhibitionItem[]; loading: boolean; reload: () => Promise<void>;
} {
    const [items, setItems] = useState<ExhibitionItem[]>([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        const data = await loadExhibitions().catch(() => [] as ExhibitionItem[]);
        setItems(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (authLoading) return;
        let cancelled = false;
        loadExhibitions()
            .then((data) => { if (!cancelled) { setItems(data); setLoading(false); } })
            .catch(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [authLoading]);

    return { items, loading, reload };
}

// ─── Actions ─────────────────────────────────────────────

export interface ExhibitionActions {
    saving: boolean;
    editingId: string | null;
    showCreate: boolean;
    setEditingId: (id: string | null) => void;
    setShowCreate: (v: boolean) => void;
    handleCreate: (data: ExhibitionFormData) => Promise<void>;
    handleUpdate: (data: ExhibitionFormData) => Promise<void>;
    handleDelete: (id: string) => Promise<void>;
    handleToggle: (b: ExhibitionItem) => Promise<void>;
    handleMove: (idx: number, dir: "up" | "down") => Promise<void>;
}

export function useExhibitionActions(items: ExhibitionItem[], reload: () => Promise<void>): ExhibitionActions {
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const handleCreate = useCallback(async (data: ExhibitionFormData) => {
        setSaving(true);
        const maxOrder = items.reduce((max, b) => Math.max(max, b.order_index), -1);
        await apiFetch("POST", { ...formToPayload(data), order_index: maxOrder + 1 });
        setShowCreate(false);
        await reload();
        setSaving(false);
    }, [items, reload]);

    const handleUpdate = useCallback(async (data: ExhibitionFormData) => {
        if (!editingId) return;
        setSaving(true);
        await apiFetch("PATCH", { id: editingId, ...formToPayload(data) });
        setEditingId(null);
        await reload();
        setSaving(false);
    }, [editingId, reload]);

    const handleDelete = useCallback(async (id: string) => {
        if (!globalThis.confirm("기획전을 삭제하시겠습니까?")) return;
        await apiFetch("DELETE", { id });
        await reload();
    }, [reload]);

    const handleToggle = useCallback(async (b: ExhibitionItem) => {
        await apiFetch("PATCH", { id: b.id, is_active: !b.is_active });
        await reload();
    }, [reload]);

    /* eslint-disable security/detect-object-injection -- Safe: accessing array by numeric index */
    const handleMove = useCallback(async (idx: number, dir: "up" | "down") => {
        const swapIdx = dir === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= items.length) return;
        const a = items[idx];
        const b = items[swapIdx];
        await Promise.all([
            apiFetch("PATCH", { id: a.id, order_index: b.order_index }),
            apiFetch("PATCH", { id: b.id, order_index: a.order_index }),
        ]);
        await reload();
    }, [items, reload]);
    /* eslint-enable security/detect-object-injection */

    return { saving, editingId, showCreate, setEditingId, setShowCreate, handleCreate, handleUpdate, handleDelete, handleToggle, handleMove };
}
