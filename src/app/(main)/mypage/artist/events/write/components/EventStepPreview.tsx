// @client-reason: AI generation triggers + preview rendering + submit
"use client";

import Image from "next/image";
import { calcDiscountRate } from "@/components/portfolio-form/portfolio-helpers";
import type {
  EventFormValues,
  EventMediaSlot,
  GeneratedEventContent,
} from "@/components/event-form/types";

export function EventStepPreview({
  values,
  mediaSlots,
  aiContent,
  aiImagePreview,
  isGenerating,
  isSubmitting,
  onGenerateText,
  onGenerateImage,
  onSubmit,
  onBack,
}: Readonly<{
  values: EventFormValues;
  mediaSlots: EventMediaSlot[];
  aiContent: GeneratedEventContent | null;
  aiImagePreview: string | null;
  isGenerating: boolean;
  isSubmitting: boolean;
  onGenerateText: () => void;
  onGenerateImage: () => void;
  onSubmit: () => void;
  onBack: () => void;
}>): React.ReactElement {
  const priceNum = Number(values.price) || 0;
  const priceOriginNum = Number(values.priceOrigin) || 0;
  const discountRate = calcDiscountRate(priceNum, priceOriginNum);

  return (
    <div className="space-y-6">
      {/* AI Generation Buttons */}
      <div className="space-y-3">
        <button
          type="button"
          disabled={isGenerating}
          onClick={onGenerateText}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {isGenerating ? (
            <span role="status" aria-label="AI 텍스트 생성 중" className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              AI가 매력적인 이벤트 글을 작성하고 있어요...
            </span>
          ) : aiContent ? (
            "AI 이벤트 글 다시 생성"
          ) : (
            "AI 이벤트 글 자동 생성하기"
          )}
        </button>

        <button
          type="button"
          disabled={isGenerating}
          onClick={onGenerateImage}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {isGenerating ? (
            <span role="status" aria-label="AI 이미지 생성 중" className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              AI 홍보 이미지 생성 중...
            </span>
          ) : aiImagePreview ? (
            "AI 홍보 이미지 다시 생성"
          ) : (
            "AI 홍보 배너 이미지 생성하기"
          )}
        </button>
      </div>

      {/* AI Generated Image Preview */}
      {aiImagePreview && (
        <div className="space-y-2">
          <p className="text-sm font-medium">AI 생성 홍보 배너</p>
          <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
            <Image
              src={aiImagePreview}
              alt="AI 생성 홍보 배너"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
            />
          </div>
        </div>
      )}

      {/* Preview Section */}
      {aiContent && (
        <div className="space-y-6 rounded-xl border border-input p-4">
          <p className="text-xs font-medium text-muted-foreground">미리보기</p>

          {/* Hero Images */}
          {mediaSlots[0]?.preview && (
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
              <Image
                src={mediaSlots[0].preview}
                alt="대표 이미지"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </div>
          )}

          {/* Price Banner */}
          <div className="flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3 dark:bg-red-950/30">
            {discountRate > 0 && (
              <span className="rounded-md bg-red-500 px-2.5 py-1 text-sm font-bold text-white">
                {discountRate}%
              </span>
            )}
            <div className="flex flex-col">
              {discountRate > 0 && (
                <span className="text-xs text-muted-foreground line-through">
                  {priceOriginNum.toLocaleString()}원
                </span>
              )}
              <span className="text-lg font-bold text-foreground">
                {priceNum.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">{aiContent.headline}</h2>
            <p className="text-sm text-muted-foreground">{aiContent.subheadline}</p>
          </div>

          {/* Info Card */}
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3">
            {values.procedureDuration && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">시술 시간</p>
                <p className="text-sm font-medium">{values.procedureDuration}</p>
              </div>
            )}
            {values.maintenancePeriod && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">유지 기간</p>
                <p className="text-sm font-medium">{values.maintenancePeriod}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">카테고리</p>
              <p className="text-sm font-medium">{values.category}</p>
            </div>
          </div>

          {/* AI Sections */}
          <div className="space-y-6">
            {aiContent.sections.map((section, i) => (
              <section key={i} className="space-y-2">
                <h3 className="text-base font-bold text-foreground">{section.heading}</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          {/* Before/After Photo */}
          {mediaSlots[1]?.preview && (
            <div className="space-y-2">
              <p className="text-sm font-medium">시술 전후</p>
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                <Image
                  src={mediaSlots[1].preview}
                  alt="시술 전후"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
              </div>
            </div>
          )}

          {/* Target Audience */}
          {aiContent.targetAudienceExpanded.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-foreground">이런 분께 추천해요</h3>
              <div className="space-y-2">
                {aiContent.targetAudienceExpanded.map((t, i) => (
                  <div key={i} className="rounded-lg bg-muted/50 px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{t.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {aiContent.faq.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-foreground">자주 묻는 질문</h3>
              <div className="space-y-2">
                {aiContent.faq.map((item, i) => (
                  <details key={i} className="group rounded-lg border border-input">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
                      {item.question}
                    </summary>
                    <p className="px-4 pb-3 text-sm text-muted-foreground">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Shop Info */}
          {mediaSlots[2]?.preview && (
            <div className="space-y-2">
              <p className="text-sm font-medium">샵 정보</p>
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                <Image
                  src={mediaSlots[2].preview}
                  alt="샵 사진"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">{values.shopName}</p>
                {values.shopRegion && <p className="text-muted-foreground">{values.shopRegion}</p>}
                {values.shopBusinessHours && <p className="text-muted-foreground">{values.shopBusinessHours}</p>}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="rounded-lg bg-brand-primary/10 px-4 py-3 text-center">
            <p className="text-sm font-medium text-brand-primary">{aiContent.callToAction}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-input py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          이전
        </button>
        <button
          type="button"
          disabled={!aiContent || isSubmitting}
          onClick={onSubmit}
          className="flex-1 rounded-lg bg-brand-primary py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          {isSubmitting ? (
            <span role="status" aria-label="이벤트 등록 중" className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              등록 중...
            </span>
          ) : (
            "등록하기"
          )}
        </button>
      </div>
    </div>
  );
}
