// @client-reason: React hook for admin point data fetching with search and pagination
"use client";

import { useState, useEffect, useCallback } from "react";
import type { AdminPointData } from "./points-types";
import { API_PATH } from "./points-types";

export function useAdminPoints(authLoading: boolean, user: unknown): {
    data: AdminPointData | null;
    loading: boolean;
    error: string | null;
    search: string;
    page: number;
    setSearch: (s: string) => void;
    setPage: (p: number) => void;
    reload: () => void;
} {
    const [data, setData] = useState<AdminPointData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const fetchData = useCallback(async (s: string, p: number) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (s) params.set("search", s);
            params.set("page", String(p));
            const res = await fetch(`${API_PATH}?${params.toString()}`);
            if (res.status === 403) { setError("관리자 권한이 필요합니다."); return; }
            if (!res.ok) { setError("데이터를 불러올 수 없습니다."); return; }
            setData(await res.json() as AdminPointData);
            setError(null);
        } catch {
            setError("서버 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && user) void fetchData(search, page);
        if (!authLoading && !user) { setError("로그인이 필요합니다."); setLoading(false); }
    }, [authLoading, user, search, page, fetchData]);

    const reload = useCallback(() => { void fetchData(search, page); }, [fetchData, search, page]);

    return { data, loading, error, search, page, setSearch, setPage, reload };
}
