/**
 * 공통 미디어 row 변환 (portfolio_media, event_media, artist_media).
 * 3개 도메인은 URL getter 만 다르므로 HOF 로 통합.
 */

import { getStorageUrl, getEventStorageUrl, getArtistMediaUrl } from "@/lib/supabase/storage-utils";

export interface MediaImageUI {
    storagePath: string;
    url: string;
    orderIndex: number;
}

interface MediaRow {
    storage_path: string;
    order_index?: number | null;
}

type UrlGetter = (path: string) => string | null;

/** 공통 변환 — 정렬 + URL 생성 + 빈 URL 필터 */
function transformMedia(rows: ReadonlyArray<MediaRow>, urlGetter: UrlGetter): MediaImageUI[] {
    return [...rows]
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((m) => ({
            storagePath: m.storage_path,
            url: urlGetter(m.storage_path) ?? "",
            orderIndex: m.order_index ?? 0,
        }))
        .filter((m) => m.url !== "");
}

/** portfolio_media row → UI 모델 */
export function transformPortfolioMedia(rows: ReadonlyArray<MediaRow>): MediaImageUI[] {
    return transformMedia(rows, getStorageUrl);
}

/** event_media row → UI 모델 */
export function transformEventMedia(rows: ReadonlyArray<MediaRow>): MediaImageUI[] {
    return transformMedia(rows, getEventStorageUrl);
}

/** artist_media row → UI 모델 */
export function transformArtistMedia(rows: ReadonlyArray<MediaRow>): MediaImageUI[] {
    return transformMedia(rows, getArtistMediaUrl);
}
