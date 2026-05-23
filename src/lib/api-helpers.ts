export function parsePagination(searchParams: URLSearchParams, defaultLimit = 20): { limit: number; offset: number } {
    return {
        limit: Math.min(Math.max(1, Number(searchParams.get("limit") ?? String(defaultLimit))), 100),
        offset: Math.max(0, Number(searchParams.get("offset") ?? "0")),
    };
}
