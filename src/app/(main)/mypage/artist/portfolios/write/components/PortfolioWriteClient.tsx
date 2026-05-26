// @client-reason: Portfolio write form with file uploads and category selection
"use client";
import { STRINGS } from "@/lib/strings";
/* eslint-disable max-lines-per-function */

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import type { CategoryItem } from "@/types/portfolio-search";
import {
    CategorySection,
    PortfolioFormFields,
    ImageUploadSection,
    YouTubeUrlInput,
    fetchCategories,
    uploadFiles,
    calcDiscountRate,
    insertMediaRowsWithEmbedding,
    insertCategorizables,
} from "@/components/portfolio-form";
import type { PortfolioFormValues } from "@/components/portfolio-form";
import { submitExhibitionEntry } from "@/lib/actions/exhibition-entries";
import { revalidatePortfolioPages } from "@/lib/actions/portfolios";
export default function PortfolioWriteClient(): React.ReactElement {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { artist, isArtist, isLoading: authLoading } = useAuth();

    const [submitting, setSubmitting] = useState(false);
    const [formValues, setFormValues] = useState<PortfolioFormValues>({
        title: "", description: "", price: "", priceOrigin: "", isEvent: false, isPermanentDiscount: false, saleEndedAt: "", youtubeUrl: "",
    });
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [selectedExhibitions, setSelectedExhibitions] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!artist) return;
        const supabase = createClient();
        fetchCategories(supabase, artist.type_artist).then(setCategories);
    }, [artist]);

    if (authLoading) return <FullPageSpinner />;
    if (!isArtist) { router.push("/login"); return <FullPageSpinner />; }
    if (!artist) { router.push("/register/artist"); return <FullPageSpinner />; }

    function handleImageFiles(files: File[]): void {
        setImages(files);
        setImagePreviews(files.map((f) => URL.createObjectURL(f)));
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

    function toggleExhibition(id: string): void {
        setSelectedExhibitions((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function submitToExhibitions(portfolioId: string): Promise<void> {
        if (!formValues.isEvent || selectedExhibitions.size === 0) return;
        const exhibitionIds = Array.from(selectedExhibitions);
        await Promise.all(exhibitionIds.map((exId) => submitExhibitionEntry(exId, portfolioId)));
    }

    function parsePrices(): { priceNum: number; priceOriginNum: number; discountRate: number; saleEnd: string | null } {
        const priceNum = Number(formValues.price) || 0;
        const priceOriginNum = Number(formValues.priceOrigin) || priceNum;
        const saleEnd = formValues.isEvent && !formValues.isPermanentDiscount && formValues.saleEndedAt
            ? formValues.saleEndedAt : null;
        return { priceNum, priceOriginNum, discountRate: calcDiscountRate(priceNum, priceOriginNum), saleEnd };
    }

    async function createPortfolio(): Promise<void> {
        if (!artist) { router.push("/login"); return; }
        if (selectedCategories.size === 0) throw new Error("CATEGORY_REQUIRED");
        const supabase = createClient();
        const imagePaths = await uploadFiles(supabase, artist.id, images);
        const { priceNum, priceOriginNum, discountRate, saleEnd } = parsePrices();
        const { data: portfolio, error } = await supabase
            .from("portfolios")
            .insert({
                artist_id: artist.id, title: formValues.title, description: formValues.description,
                price: priceNum, price_origin: priceOriginNum, discount_rate: discountRate, sale_ended_at: saleEnd,
                youtube_url: formValues.youtubeUrl || null,
            })
            .select("id")
            .single();
        if (error) throw error;
        if (!portfolio) return;
        await insertMediaRowsWithEmbedding(supabase, portfolio.id, imagePaths, "image", 0);
        await insertCategorizables(supabase, portfolio.id, Array.from(selectedCategories));
        await submitToExhibitions(portfolio.id);
    }

    async function handleSubmit(e: FormEvent): Promise<void> {
        e.preventDefault();
        if (selectedCategories.size === 0) {
            alert("대표 분류를 1개 이상 선택해주세요.");
            return;
        }
        setSubmitting(true);
        try {
            await createPortfolio();
            // 포트폴리오 등록 포인트
            void fetch("/api/points/earn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "PORTFOLIO_UPLOAD" }) });
            // 목록 페이지 + 공개 샵 페이지 server cache 무효화
            if (artist) {
                await revalidatePortfolioPages(artist.id).catch((err: unknown) => {
                    // eslint-disable-next-line no-console
                    console.error("Portfolio cache invalidation failed:", err);
                });
            }
            // PortfolioListClient 가 React Query 로 데이터를 보유 → 별도로 client cache 도 invalidate.
            // (force-dynamic server + revalidatePath + router.refresh 만으로는 React Query cache 가 stale 노출)
            await queryClient.invalidateQueries({ queryKey: ["portfolios", "owned"] });
            const hasExhibitions = formValues.isEvent && selectedExhibitions.size > 0;
            alert(hasExhibitions ? "등록 및 기획전 출품이 완료되었습니다." : "등록되었습니다.");
            router.push("/mypage/artist/portfolios");
            router.refresh();
        } catch (err: unknown) {
            const msg = err instanceof Error && err.message === "CATEGORY_REQUIRED"
                ? "대표 분류를 1개 이상 선택해주세요."
                : "등록에 실패했습니다. 다시 시도해주세요.";
            alert(msg);
        } finally {
            setSubmitting(false);
        }
    }

    const isSemiPermanent = artist?.type_artist === "SEMI_PERMANENT";

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <p className="text-sm text-muted-foreground mb-6">포트폴리오 정보를 입력해 주세요.</p>
            <form onSubmit={(e): void => { void handleSubmit(e); }} className="space-y-6">

                <PortfolioFormFields
                    values={formValues}
                    onValuesChange={(patch): void => setFormValues((prev) => ({ ...prev, ...patch }))}
                    selectedExhibitionIds={selectedExhibitions}
                    onToggleExhibition={toggleExhibition}
                />

                {/* 작품 사진 업로드 */}
                <ImageUploadSection previews={imagePreviews} files={images} onFilesChange={handleImageFiles} />

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

                {/* 등록하기 — 대표 분류 미선택 시 비활성화 (UX + 검증 다중 방어) */}
                <button
                    type="submit"
                    disabled={submitting || selectedCategories.size === 0}
                    aria-disabled={submitting || selectedCategories.size === 0}
                    className="w-full py-3.5 rounded-md bg-brand-primary text-white font-bold text-base hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? STRINGS.common.saving : "등록하기"}
                </button>
                {selectedCategories.size === 0 ? (
                    <p className="text-xs text-brand-primary text-center -mt-3">대표 분류를 1개 이상 선택해야 등록할 수 있습니다.</p>
                ) : null}
            </form>
        </div>
    );
}
