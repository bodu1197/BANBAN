// @client-reason: 위저드 3단계 — 작품(포트폴리오) 연속 등록 폼 + 진행 현황(브라우저 File API)
"use client";
// 사유: 진행현황 카드 + 썸네일 + 작품 입력 폼 JSX 가 한 컴포넌트에 모여 80줄을 넘는다.
// 폼 상태/핸들러는 usePortfolioFormState 훅으로 분리했고, 남은 건 렌더라 추가 분할은 과도한 단편화.
/* eslint-disable max-lines-per-function */

import { useState } from "react";
import Image from "next/image";
import { Sparkles, TrendingUp } from "lucide-react";
import {
  CategorySection,
  PortfolioFormFields,
  ImageUploadSection,
  YouTubeUrlInput,
  usePortfolioFormState,
  validatePortfolioForm,
  createPortfolioRecord,
} from "@/components/portfolio-form";
import { REQUIRED_PORTFOLIOS } from "@/lib/artist-status";

function ProgressHint({ reachedGate, reachedMin, minRequired }: Readonly<{
  reachedGate: boolean; reachedMin: boolean; minRequired: number;
}>): React.ReactElement {
  if (reachedGate) {
    return <p className="mt-2 text-xs font-medium text-emerald-600">공개 준비 완료! ‘완료’를 누르면 샵이 바로 공개됩니다.</p>;
  }
  if (reachedMin) {
    return <p className="mt-2 text-xs text-muted-foreground">‘완료’를 눌러 진행할 수 있어요. 더 채우면 바로 공개까지 됩니다.</p>;
  }
  return <p className="mt-2 text-xs text-muted-foreground">작품을 {minRequired}개 이상 등록하면 바로 공개할 수 있어요.</p>;
}

export function PortfolioStep({
  artistId, typeArtist, addedPreviews, minRequired, onAdded,
}: Readonly<{
  artistId: string;
  typeArtist: string;
  addedPreviews: readonly string[];
  minRequired: number;
  /** 작품 1건 추가 성공 시 — 부모가 미리보기 URL 을 보관(썸네일·카운트 단일 소스). */
  onAdded: (previewUrl: string) => void;
}>): React.ReactElement {
  const pf = usePortfolioFormState(typeArtist);
  const [submitting, setSubmitting] = useState(false);

  async function handleAddPortfolio(): Promise<void> {
    const error = validatePortfolioForm({ formValues: pf.formValues, imageCount: pf.images.length, categoryCount: pf.selectedCategories.size });
    if (error) { alert(error); return; }
    const previewUrl = pf.imagePreviews[0] ?? "";
    setSubmitting(true);
    try {
      const newId = await createPortfolioRecord({
        artistId,
        formValues: pf.formValues,
        images: pf.images,
        categoryIds: Array.from(pf.selectedCategories),
        exhibitionIds: pf.formValues.isEvent ? Array.from(pf.selectedExhibitions) : [],
      });
      if (!newId) { alert("등록에 실패했습니다. 다시 시도해주세요."); return; }
      // 포트폴리오 등록 포인트 — 작품당 1회(referenceId 로 서버에서 멱등 처리)
      void fetch("/api/points/earn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "PORTFOLIO_UPLOAD", referenceId: newId }) }).catch(() => { /* best-effort */ });
      onAdded(previewUrl); // 부모가 썸네일 보관(여기선 revoke 하지 않음)
      pf.resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message === "CATEGORY_REQUIRED"
        ? "대표 분류를 1개 이상 선택해주세요."
        : "등록에 실패했습니다. 다시 시도해주세요.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const count = addedPreviews.length;
  const reachedMin = count >= minRequired;
  const reachedGate = count >= REQUIRED_PORTFOLIOS;
  const isSemiPermanent = typeArtist === "SEMI_PERMANENT";
  const progressPct = Math.min(100, (count / REQUIRED_PORTFOLIOS) * 100);

  return (
    <div className="space-y-6 p-4">
      {/* 진행 현황 + 동기부여 메시지 */}
      <div className="rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            등록한 작품 <span className="text-brand-primary">{count}</span>개
          </p>
          <span className={`text-xs font-medium tabular-nums ${count >= REQUIRED_PORTFOLIOS ? "text-emerald-600" : "text-muted-foreground"}`}>
            {count >= REQUIRED_PORTFOLIOS ? "공개 가능 ✓" : `작품 ${REQUIRED_PORTFOLIOS}개면 공개`}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={REQUIRED_PORTFOLIOS} aria-valuenow={Math.min(count, REQUIRED_PORTFOLIOS)} aria-label="작품 등록 진행률">
          <div className="h-full rounded-full bg-brand-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-xs text-brand-primary">
          <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>작품은 {REQUIRED_PORTFOLIOS}개만 올려도 바로 공개돼요. 많이 올릴수록 상담 문의가 비례해서 늘어나니 꾸준히 추가해 주세요.</span>
        </p>
        <ProgressHint reachedGate={reachedGate} reachedMin={reachedMin} minRequired={minRequired} />
      </div>

      {/* 추가된 작품 썸네일 */}
      {count > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="등록한 작품 미리보기">
          {addedPreviews.map((src, idx) => (
            <div key={src} className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
              <Image src={src} alt={`등록한 작품 ${idx + 1}`} fill sizes="64px" unoptimized className="object-cover" />
              <span className="absolute bottom-0 right-0 rounded-tl bg-brand-primary px-1 text-[10px] font-semibold leading-tight text-white">{idx + 1}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* 작품 입력 폼 */}
      <div className="space-y-6 rounded-xl border border-border p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-brand-primary" aria-hidden="true" /> 새 작품 추가
        </p>
        <PortfolioFormFields
          values={pf.formValues}
          onValuesChange={(patch): void => pf.setFormValues((prev) => ({ ...prev, ...patch }))}
          selectedExhibitionIds={pf.selectedExhibitions}
          onToggleExhibition={pf.toggleExhibition}
          onAiDescribe={() => void pf.handleAiDescribe()}
          aiDescribing={pf.aiDescribing}
        />
        <ImageUploadSection previews={pf.imagePreviews} files={pf.images} onFilesChange={pf.handleImageFiles} maxFiles={1} label="작품 사진 (1장)" />
        <YouTubeUrlInput value={pf.formValues.youtubeUrl} onChange={(url): void => pf.setFormValues((prev) => ({ ...prev, youtubeUrl: url }))} />
        <CategorySection
          categories={pf.categories}
          selectedCategories={pf.selectedCategories}
          isSemiPermanent={isSemiPermanent}
          onSelectionChange={pf.setSelectedCategories}
          onSelectCategory={pf.selectCategory}
        />
        <button
          type="button"
          onClick={() => void handleAddPortfolio()}
          disabled={submitting || pf.selectedCategories.size === 0}
          aria-disabled={submitting || pf.selectedCategories.size === 0}
          className="w-full rounded-md bg-brand-primary py-3.5 text-base font-bold text-white transition-opacity hover:opacity-90 focus-visible:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "추가 중…" : "이 작품 추가하기"}
        </button>
        {pf.selectedCategories.size === 0 ? (
          <p className="-mt-3 text-center text-xs text-brand-primary">대표 분류를 1개 이상 선택해야 추가할 수 있습니다.</p>
        ) : null}
      </div>
    </div>
  );
}
