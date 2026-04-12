// ─── Types for Portfolio Edit Admin ──────────────────────

export interface MediaItem {
    id: string;
    type: string;
    storage_path: string;
    order_index: number;
}

export interface PortfolioData {
    id: string;
    title: string;
    description: string;
    price: number;
    price_origin: number;
    discount_rate: number;
    sale_ended_at: string | null;
    artist: { id: string; title: string; type_artist: string } | null;
}

export interface PortfolioForm {
    title: string;
    description: string;
    price: string;
    priceOrigin: string;
    saleEndedAt: string;
}
