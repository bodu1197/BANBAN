import { createClient } from "@/lib/supabase/client";
import { toCategoryType } from "@/types/portfolio-search";
import type { CategoryItem } from "@/types/portfolio-search";
import type { SupabaseClient } from "@supabase/supabase-js";
import { optimizeImage } from "@/lib/utils/image-optimizer";

// --- Category fetching ---

export async function fetchCategories(supabase: SupabaseClient, artistType?: string): Promise<CategoryItem[]> {
    let query = supabase
        .from("categories")
        .select("id, name, category_type, artist_type, parent_id, target_gender, order_index")
        .order("order_index", { ascending: true });

    if (artistType) {
        query = query.eq("artist_type", artistType);
    }

    const { data } = await query;
    if (!data) return [];
    return data.flatMap((row: { id: string; name: string; category_type: string | null; artist_type: string | null; parent_id: string | null; target_gender: string | null }) => {
        const type = toCategoryType(row.category_type);
        if (!type) return [];
        return [{ id: row.id, name: row.name, type, parentId: row.parent_id, targetGender: row.target_gender, artistType: row.artist_type }];
    });
}

// --- File upload ---

/**
 * Upload media files to the portfolios bucket.
 * Images are converted to WebP (max 1600px, q=0.85) client-side via Canvas
 * before upload — this matches the server-side Sharp pipeline used by other
 * upload paths and prevents raw .jpeg/.png blobs from landing in storage.
 * Non-image files (videos) are uploaded as-is.
 */
export async function uploadFiles(
    supabase: SupabaseClient,
    artistId: string,
    files: File[],
): Promise<string[]> {
    const paths: string[] = [];
    for (const file of files) {
        const isImage = file.type.startsWith("image/");
        let body: Blob = file;
        let ext = file.name.split(".").pop() ?? "bin";
        let contentType = file.type || "application/octet-stream";

        if (isImage) {
            body = await optimizeImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.85 });
            ext = "webp";
            contentType = "image/webp";
        }

        const path = `${artistId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error } = await supabase.storage.from("portfolios").upload(path, body, {
            cacheControl: "31536000",
            upsert: false,
            contentType,
        });
        if (error) throw new Error(`파일 업로드 실패: ${file.name}`);
        paths.push(path);
    }
    return paths;
}

// --- Price calculation ---

export function calcDiscountRate(priceNum: number, priceOriginNum: number): number {
    return priceOriginNum > 0
        ? Math.max(0, Math.round(((priceOriginNum - priceNum) / priceOriginNum) * 100))
        : 0;
}

// --- Category sync (edit mode) ---

export async function syncCategories(
    supabase: SupabaseClient,
    portfolioId: string,
    categoryIds: string[],
): Promise<void> {
    await supabase.from("categorizables").delete()
        .eq("categorizable_type", "portfolio")
        .eq("categorizable_id", portfolioId);
    if (categoryIds.length > 0) {
        const rows = categoryIds.map((category_id) => ({
            category_id,
            categorizable_type: "portfolio" as const,
            categorizable_id: portfolioId,
        }));
        await supabase.from("categorizables").insert(rows);
    }
}

// --- Media insert with embedding ---

export async function insertMediaRowsWithEmbedding(
    supabase: SupabaseClient,
    portfolioId: string,
    paths: string[],
    type: "image" | "video",
    startIndex: number,
): Promise<void> {
    const rows = paths.map((p, i) => ({
        portfolio_id: portfolioId,
        type,
        storage_path: p,
        order_index: startIndex + i,
    }));
    if (rows.length === 0) return;
    const { data: inserted, error } = await supabase.from("portfolio_media").insert(rows).select("id, storage_path, type");
    if (error) throw new Error(`미디어 저장 실패: ${error.message}`);
    if (inserted) {
        for (const media of inserted) {
            if (media.type !== "image") continue;
            fetch("/api/ai/embed-single", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mediaId: media.id, storagePath: media.storage_path }),
            }).catch(() => { /* fire-and-forget */ });
        }
    }
}

// --- Category insert (write mode) ---

export async function insertCategorizables(
    supabase: SupabaseClient,
    portfolioId: string,
    categoryIds: string[],
): Promise<void> {
    if (categoryIds.length === 0) return;
    const rows = categoryIds.map((category_id) => ({
        category_id,
        categorizable_type: "portfolio" as const,
        categorizable_id: portfolioId,
    }));
    await supabase.from("categorizables").insert(rows);
}

// --- Upload all media (write mode convenience) ---

export async function uploadAllMedia(
    supabase: SupabaseClient,
    artistId: string,
    imageFiles: File[],
    videoFiles: File[],
): Promise<{ imagePaths: string[]; videoPaths: string[] }> {
    const [imagePaths, videoPaths] = await Promise.all([
        uploadFiles(supabase, artistId, imageFiles),
        uploadFiles(supabase, artistId, videoFiles),
    ]);
    return { imagePaths, videoPaths };
}

// --- Upload new media for edit mode ---

export async function uploadNewMedia(
    supabase: SupabaseClient,
    portfolioId: string,
    artistId: string,
    files: File[],
    existingCount: number,
): Promise<void> {
    if (files.length === 0) return;
    const paths = await uploadFiles(supabase, artistId, files);
    await insertMediaRowsWithEmbedding(supabase, portfolioId, paths, "image", existingCount);
}

// --- Save portfolio (edit mode) ---

interface SavePayload {
    title: string;
    description: string;
    price: number;
    price_origin: number;
    discount_rate: number;
    sale_ended_at: string | null;
    youtube_url: string | null;
    categoryIds: string[];
    deletedMediaIds: string[];
}

export type { SavePayload };

export async function savePortfolio(portfolioId: string, payload: SavePayload): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("portfolios").update({
        title: payload.title, description: payload.description,
        price: payload.price, price_origin: payload.price_origin,
        discount_rate: payload.discount_rate, sale_ended_at: payload.sale_ended_at,
        youtube_url: payload.youtube_url,
    }).eq("id", portfolioId);
    if (error) throw error;
    if (payload.deletedMediaIds.length > 0) await supabase.from("portfolio_media").delete().in("id", payload.deletedMediaIds);
    await syncCategories(supabase, portfolioId, payload.categoryIds);
}
