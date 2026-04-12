// Shared types for portfolio write/edit forms

export interface MediaItem {
    id: string;
    type: string;
    storage_path: string;
    order_index: number;
}

export interface PortfolioFormValues {
    title: string;
    description: string;
    price: string;
    priceOrigin: string;
    isEvent: boolean;
    isPermanentDiscount: boolean;
    saleEndedAt: string;
    youtubeUrl: string;
}
