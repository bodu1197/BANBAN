// @client-reason: React hooks for portfolio detail fetching and category loading
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toCategoryType } from "@/types/portfolio-search";
import type { CategoryItem } from "@/types/portfolio-search";
import type { PortfolioData, MediaItem } from "./edit-types";

// ─── Portfolio Detail Hook ───────────────────────────────

export function usePortfolioDetail(id: string, authLoading: boolean, user: unknown): {
    portfolio: PortfolioData | null;
    media: MediaItem[];
    categoryIds: string[];
    loading: boolean;
    error: string | null;
} {
    const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [categoryIds, setCategoryIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/portfolios/${id}`);
            if (!res.ok) { setError("포트폴리오를 불러올 수 없습니다."); return; }
            const data = await res.json() as { portfolio: PortfolioData; media: MediaItem[]; categoryIds: string[] };
            setPortfolio(data.portfolio);
            setMedia(data.media);
            setCategoryIds(data.categoryIds);
        } catch {
            setError("서버 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (!authLoading && user) fetchData();
        if (!authLoading && !user) { setError("로그인이 필요합니다."); setLoading(false); }
    }, [authLoading, user, fetchData]);

    return { portfolio, media, categoryIds, loading, error };
}

// ─── Categories Hook ─────────────────────────────────────

export function useCategories(artistType?: string): CategoryItem[] {
    const [categories, setCategories] = useState<CategoryItem[]>([]);

    useEffect(() => {
        const supabase = createClient();
        let query = supabase.from("categories").select("id, name, category_type, artist_type, parent_id, target_gender").order("name", { ascending: true });
        if (artistType) {
            query = query.eq("artist_type", artistType);
        }
        query.then(({ data }) => {
            if (!data) return;
            setCategories(data.flatMap((row: { id: string; name: string; category_type: string | null; artist_type: string | null; parent_id: string | null; target_gender: string | null }) => {
                const type = toCategoryType(row.category_type);
                return type ? [{ id: row.id, name: row.name, type, parentId: row.parent_id, targetGender: row.target_gender, artistType: row.artist_type }] : [];
            }));
        });
    }, [artistType]);

    return categories;
}
