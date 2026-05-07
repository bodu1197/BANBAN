// @client-reason: Portfolio edit form with file uploads, category selection, and media management
"use client";
import { STRINGS } from "@/lib/strings";
/* eslint-disable max-lines-per-function */

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryItem } from "@/types/portfolio-search";
import {
    CategorySection,
    PortfolioFormFields,
    ExistingMediaGrid,
    ImageUploadSection,
    YouTubeUrlInput,
    fetchCategories,
    calcDiscountRate,
    uploadNewMedia,
    savePortfolio,
} from "@/components/portfolio-form";
import type { MediaItem, PortfolioFormValues, SavePayload } from "@/components/portfolio-form";
import { submitExhibitionEntry, withdrawExhibitionEntry } from "@/lib/actions/exhibition-entries";

// --- Types ---

interface PortfolioDetail {
    id: string;
    title: string;
    description: string;
    price: number;
    price_origin: number;
    discount_rate: number;
    sale_ended_at: string | null;
    youtube_url: string | null;
    artist_id: string;
}

interface PortfolioEditClientProps {
    portfolioId: string;
}

// --- Data fetching helpers (edit-specific) ---

async function fetchPortfolio(supabase: SupabaseClient, id: string): Promise<PortfolioDetail | null> {
    const { data } = await supabase
        .from("portfolios")
        .select("id, title, description, price, price_origin, discount_rate, sale_ended_at, youtube_url, artist_id")
        .eq("id", id)
        .is("deleted_at", null)
        .single();
    return data as PortfolioDetail | null;
}

async function fetchMedia(supabase: SupabaseClient, portfolioId: string): Promise<MediaItem[]> {
    const { data } = await supabase
        .from("portfolio_media")
        .select("id, type, storage_path, order_index")
        .eq("portfolio_id", portfolioId)
        .order("order_index", { ascending: true });
    return (data ?? []) as MediaItem[];
}

async function checkIsAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
    const { data } = await supabase.from("profiles").select("is_admin").eq("id", userId).single();
    return (data as { is_admin: boolean } | null)?.is_admin === true;
}

async function deletePortfolioById(supabase: SupabaseClient, portfolioId: string): Promise<boolean> {
    const { error } = await supabase
        .from("portfolios")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", portfolioId);
    return !error;
}

async function fetchCategoryIds(supabase: SupabaseClient, portfolioId: string): Promise<string[]> {
    const { data } = await supabase
        .from("categorizables")
        .select("category_id")
        .eq("categorizable_type", "portfolio")
        .eq("categorizable_id", portfolioId);
    return (data ?? []).map((c: { category_id: string }) => c.category_id);
}

async function fetchArtistType(supabase: SupabaseClient, artistId: string): Promise<string> {
    const { data } = await supabase.from("artists").select("type_artist").eq("id", artistId).single();
    return (data as { type_artist: string } | null)?.type_artist ?? "SEMI_PERMANENT";
}

interface ExhibitionEntry { id: string; exhibition_id: string; status: string }

async function fetchExhibitionEntries(supabase: SupabaseClient, portfolioId: string): Promise<ExhibitionEntry[]> {
    const { data } = await supabase
        .from("exhibition_entries")
        .select("id, exhibition_id, status")
        .eq("portfolio_id", portfolioId);
    return (data ?? []) as ExhibitionEntry[];
}

// --- Data loading orchestration ---

interface LoadResult {
    portfolio: PortfolioDetail;
    media: MediaItem[];
    categoryIds: string[];
    categories: CategoryItem[];
    artistType: string;
    exhibitionEntries: ExhibitionEntry[];
}

async function loadPortfolioData(
    user: { id: string },
    artist: { id: string; type_artist: string } | null,
    portfolioId: string,
        router: ReturnType<typeof useRouter>,
): Promise<LoadResult | null> {
    const supabase = createClient();
    const adminFlag = await checkIsAdmin(supabase, user.id);

    const portfolio = await fetchPortfolio(supabase, portfolioId);
    if (!portfolio) {
        alert("포트폴리오를 찾을 수 없습니다.");
        return null;
    }
    if (!adminFlag && (!artist || portfolio.artist_id !== artist.id)) {
        alert("수정 권한이 없습니다.");
        router.push(artist ? "/mypage/artist/portfolios" : "/login");
        return null;
    }
    const artistType = await fetchArtistType(supabase, portfolio.artist_id);
    const [media, categoryIds, categories, exhibitionEntries] = await Promise.all([
        fetchMedia(supabase, portfolioId),
        fetchCategoryIds(supabase, portfolioId),
        fetchCategories(supabase, artistType),
        fetchExhibitionEntries(supabase, portfolioId),
    ]);
    return { portfolio, media, categoryIds, categories, artistType, exhibitionEntries };
}

// --- Main Component ---

export default function PortfolioEditClient({
    portfolioId,

}: Readonly<PortfolioEditClientProps>): React.ReactElement {
    const router = useRouter();
    const { user, artist, isLoading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formValues, setFormValues] = useState<PortfolioFormValues>({
        title: "", description: "", price: "", priceOrigin: "", isEvent: false, isPermanentDiscount: false, saleEndedAt: "", youtubeUrl: "",
    });
    const [existingMedia, setExistingMedia] = useState<MediaItem[]>([]);
    const [deletedMediaIds, setDeletedMediaIds] = useState<Set<string>>(new Set());
    const [newImages, setNewImages] = useState<File[]>([]);
    const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [portfolioArtistId, setPortfolioArtistId] = useState("");
    const [portfolioArtistType, setPortfolioArtistType] = useState("");
    const [selectedExhibitions, setSelectedExhibitions] = useState<Set<string>>(new Set());
    const [initialExhibitionEntries, setInitialExhibitionEntries] = useState<ExhibitionEntry[]>([]);

    useEffect(() => {
        if (authLoading || !user) return;
        loadPortfolioData(user, artist, portfolioId, router).then((result) => {
            if (!result) return;
            const hasDiscount = result.portfolio.discount_rate > 0;
            const hasSaleDate = !!result.portfolio.sale_ended_at;
            setFormValues({
                title: result.portfolio.title,
                description: result.portfolio.description ?? "",
                price: String(result.portfolio.price),
                priceOrigin: String(result.portfolio.price_origin),
                isEvent: hasSaleDate || hasDiscount,
                isPermanentDiscount: hasDiscount && !hasSaleDate,
                saleEndedAt: result.portfolio.sale_ended_at?.slice(0, 10) ?? "",
                youtubeUrl: result.portfolio.youtube_url ?? "",
            });
            setExistingMedia(result.media);
            setSelectedCategories(new Set(result.categoryIds));
            setCategories(result.categories);
            setPortfolioArtistId(result.portfolio.artist_id);
            setPortfolioArtistType(result.artistType);
            setInitialExhibitionEntries(result.exhibitionEntries);
            setSelectedExhibitions(new Set(result.exhibitionEntries.map((e) => e.exhibition_id)));
            setLoading(false);
        });
    }, [authLoading, user, artist, portfolioId, router]);

    if (authLoading || loading) return <FullPageSpinner />;

    function handleImageFiles(files: File[]): void {
        setNewImages(files);
        setNewImagePreviews(files.map((f) => URL.createObjectURL(f)));
    }

    function selectCategory(id: string): void {
        const cat = categories.find((c) => c.id === id);
        if (!cat) return;
        setSelectedCategories((prev) => {
            const sameTypeIds = new Set(categories.filter((c) => c.type === cat.type).map((c) => c.id));
            const next = new Set([...prev].filter((prevId) => !sameTypeIds.has(prevId)));
            next.add(id);
            return next;
        });
    }

    function handleDeleteMedia(id: string): void {
        setDeletedMediaIds((prev) => new Set([...prev, id]));
    }

    function toggleExhibition(id: string): void {
        setSelectedExhibitions((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function syncExhibitions(): Promise<void> {
        const initialIds = new Set(initialExhibitionEntries.map((e) => e.exhibition_id));
        const added = [...selectedExhibitions].filter((id) => !initialIds.has(id));
        const removed = initialExhibitionEntries.filter((e) => !selectedExhibitions.has(e.exhibition_id) && e.status === "pending");
        await Promise.all([
            ...added.map((exId) => submitExhibitionEntry(exId, portfolioId)),
            ...removed.map((e) => withdrawExhibitionEntry(e.id)),
        ]);
    }

    function buildPayload(): SavePayload {
        const priceNum = Number(formValues.price) || 0;
        const priceOriginNum = Number(formValues.priceOrigin) || priceNum;
        return {
            title: formValues.title,
            description: formValues.description,
            price: priceNum,
            price_origin: priceOriginNum,
            discount_rate: calcDiscountRate(priceNum, priceOriginNum),
            sale_ended_at: formValues.isEvent && !formValues.isPermanentDiscount && formValues.saleEndedAt ? formValues.saleEndedAt : null,
            youtube_url: formValues.youtubeUrl || null,
            categoryIds: Array.from(selectedCategories),
            deletedMediaIds: Array.from(deletedMediaIds),
        };
    }

    async function handleSubmit(e: FormEvent): Promise<void> {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);
        try {
            const payload = buildPayload();
            const effectiveArtistId = artist?.id ?? portfolioArtistId;
            await savePortfolio(portfolioId, payload);
            const supabase = createClient();
            const activeCount = existingMedia.filter((m) => !deletedMediaIds.has(m.id)).length;
            await uploadNewMedia(supabase, portfolioId, effectiveArtistId, newImages, activeCount);
            if (formValues.isEvent) await syncExhibitions();
            alert("수정되었습니다.");
            router.push(portfolioListPath);
        } catch {
            alert("수정에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(): Promise<void> {
        if (!globalThis.confirm("정말 이 포트폴리오를 삭제하시겠습니까?")) return;
        setSubmitting(true);
        try {
            const ok = await deletePortfolioById(createClient(), portfolioId);
            if (!ok) throw new Error("삭제 실패");
            alert("삭제되었습니다.");
            router.push(portfolioListPath);
        } catch {
            alert("삭제에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    }

    const isSemiPermanent = (portfolioArtistType || artist?.type_artist) === "SEMI_PERMANENT";
    const portfolioListPath = "/mypage/artist/portfolios";

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <p className="text-sm text-muted-foreground mb-6">포트폴리오 정보를 수정합니다.</p>
            <form onSubmit={(e): void => { void handleSubmit(e); }} className="space-y-6">

                <PortfolioFormFields
                    values={formValues}
                    onValuesChange={(patch): void => setFormValues((prev) => ({ ...prev, ...patch }))}
                    selectedExhibitionIds={selectedExhibitions}
                    onToggleExhibition={toggleExhibition}
                />

                {/* 기존 이미지 */}
                <div>
                    <label className="block text-sm font-medium mb-1.5">기존 이미지</label>
                    <ExistingMediaGrid media={existingMedia} deletedIds={deletedMediaIds} onDelete={handleDeleteMedia} />
                    {existingMedia.filter((m) => !deletedMediaIds.has(m.id)).length === 0 && (
                        <p className="text-sm text-muted-foreground">이미지가 없습니다.</p>
                    )}
                </div>

                {/* 새 이미지 추가 */}
                <ImageUploadSection
                    previews={newImagePreviews}
                    files={newImages}
                    onFilesChange={handleImageFiles}
                    label="새 이미지 추가"
                />

                {/* YouTube 영상 URL */}
                <YouTubeUrlInput value={formValues.youtubeUrl} onChange={(url): void => setFormValues((prev) => ({ ...prev, youtubeUrl: url }))} />

                {/* 대표 분류 */}
                <CategorySection
                    categories={categories}
                    selectedCategories={selectedCategories}
                    isSemiPermanent={isSemiPermanent}
                    onSelectionChange={setSelectedCategories}
                    onSelectCategory={selectCategory}
                />

                {/* 수정하기 */}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-md bg-brand-primary text-white font-bold text-base hover:opacity-90 focus-visible:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-opacity disabled:opacity-50"
                >
                    {submitting ? STRINGS.common.saving : "수정하기"}
                </button>
            </form>

            {/* 삭제하기 */}
            <button
                type="button"
                disabled={submitting}
                onClick={(): void => { void handleDelete(); }}
                className="mt-4 w-full py-3.5 rounded-md border border-destructive text-destructive font-bold text-base hover:bg-destructive hover:text-white focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-50"
            >
                포트폴리오 삭제
            </button>
        </div>
    );
}
