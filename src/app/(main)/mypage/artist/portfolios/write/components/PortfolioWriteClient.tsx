// @client-reason: Portfolio write form with file uploads and category selection
"use client";
// 사유: 작품 작성 폼 컴포넌트 — 폼 필드·이미지·YouTube·분류·제출 버튼 JSX 가 한 컴포넌트에 모여
// 80줄을 넘는다. 폼 상태/핸들러는 usePortfolioFormState 훅으로 분리, 남은 건 폼 렌더라 추가 분할은 과도.
/* eslint-disable max-lines-per-function */
import { STRINGS } from "@/lib/strings";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import {
    CategorySection,
    PortfolioFormFields,
    ImageUploadSection,
    YouTubeUrlInput,
    usePortfolioFormState,
    validatePortfolioForm,
    createPortfolioRecord,
} from "@/components/portfolio-form";
import { revalidatePortfolioPages } from "@/lib/actions/portfolios";

export default function PortfolioWriteClient(): React.ReactElement {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { artist, isArtist, isLoading: authLoading } = useAuth();

    const [submitting, setSubmitting] = useState(false);
    const pf = usePortfolioFormState(artist?.type_artist);

    if (authLoading) return <FullPageSpinner />;
    if (!isArtist) { router.push("/login"); return <FullPageSpinner />; }
    if (!artist) { router.push("/register/artist"); return <FullPageSpinner />; }

    async function createPortfolio(): Promise<string | null> {
        if (!artist) { router.push("/login"); return null; }
        return createPortfolioRecord({
            artistId: artist.id,
            formValues: pf.formValues,
            images: pf.images,
            categoryIds: Array.from(pf.selectedCategories),
            exhibitionIds: pf.formValues.isEvent ? Array.from(pf.selectedExhibitions) : [],
        });
    }

    async function handleSubmit(e: FormEvent): Promise<void> {
        e.preventDefault();
        const validationError = validatePortfolioForm({ formValues: pf.formValues, imageCount: pf.images.length, categoryCount: pf.selectedCategories.size });
        if (validationError) { alert(validationError); return; }
        setSubmitting(true);
        try {
            const newPortfolioId = await createPortfolio();
            // 포트폴리오 등록 포인트 — 포트폴리오당 1회(referenceId 로 서버에서 멱등 처리)
            if (newPortfolioId) {
                void fetch("/api/points/earn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "PORTFOLIO_UPLOAD", referenceId: newPortfolioId }) }).catch(() => { /* best-effort */ });
            }
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
            const hasExhibitions = pf.formValues.isEvent && pf.selectedExhibitions.size > 0;
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

    const isSemiPermanent = artist.type_artist === "SEMI_PERMANENT";

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <p className="text-sm text-muted-foreground mb-6">포트폴리오 정보를 입력해 주세요.</p>
            <form onSubmit={(e): void => { void handleSubmit(e); }} className="space-y-6">

                <PortfolioFormFields
                    values={pf.formValues}
                    onValuesChange={(patch): void => pf.setFormValues((prev) => ({ ...prev, ...patch }))}
                    selectedExhibitionIds={pf.selectedExhibitions}
                    onToggleExhibition={pf.toggleExhibition}
                    onAiDescribe={() => void pf.handleAiDescribe()}
                    aiDescribing={pf.aiDescribing}
                />

                {/* 작품 사진 업로드 — 포트폴리오 1개당 1장 */}
                <ImageUploadSection previews={pf.imagePreviews} files={pf.images} onFilesChange={pf.handleImageFiles} maxFiles={1} label="작품 사진 (1장)" />

                {/* YouTube 영상 URL */}
                <YouTubeUrlInput value={pf.formValues.youtubeUrl} onChange={(url): void => pf.setFormValues((prev) => ({ ...prev, youtubeUrl: url }))} />

                {/* 대표 분류 */}
                <CategorySection
                    categories={pf.categories}
                    selectedCategories={pf.selectedCategories}
                    isSemiPermanent={isSemiPermanent}
                    onSelectionChange={pf.setSelectedCategories}
                    onSelectCategory={pf.selectCategory}
                />

                {/* 등록하기 — 대표 분류 미선택 시 비활성화 (UX + 검증 다중 방어) */}
                <button
                    type="submit"
                    disabled={submitting || pf.selectedCategories.size === 0}
                    aria-disabled={submitting || pf.selectedCategories.size === 0}
                    className="w-full py-3.5 rounded-md bg-brand-primary text-white font-bold text-base hover:opacity-90 focus-visible:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? STRINGS.common.saving : "등록하기"}
                </button>
                {pf.selectedCategories.size === 0 ? (
                    <p className="text-xs text-brand-primary text-center -mt-3">대표 분류를 1개 이상 선택해야 등록할 수 있습니다.</p>
                ) : null}
            </form>
        </div>
    );
}
