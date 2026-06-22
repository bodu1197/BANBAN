// @client-reason: Form input fields with controlled state for portfolio write/edit
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getStorageUrl } from "@/lib/supabase/storage-utils";
import type { PortfolioFormValues } from "./types";

const INPUT_CLASS = "w-full px-3 py-2.5 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const LABEL_CLASS = "block text-sm font-medium mb-1.5";

export function TitleField({ value, onChange }: Readonly<{
    value: string;
    onChange: (v: string) => void;
}>): React.ReactElement {
    return (
        <div>
            <label className={LABEL_CLASS}>제목 <span className="text-destructive">*</span></label>
            <input
                type="text"
                value={value}
                onChange={(e): void => onChange(e.target.value)}
                placeholder="제목을 입력해주세요"
                required
                className={INPUT_CLASS}
            />
        </div>
    );
}

export function EventToggleField({ isEvent, onChange }: Readonly<{
    isEvent: boolean;
    onChange: (v: boolean) => void;
}>): React.ReactElement {
    return (
        <div>
            <label className={LABEL_CLASS}>이벤트 진행 여부 <span className="text-destructive">*</span></label>
            <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="isEvent" checked={!isEvent} onChange={(): void => onChange(false)} className="accent-brand-primary" />
                    <span className="text-sm">일반 작품</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="isEvent" checked={isEvent} onChange={(): void => onChange(true)} className="accent-brand-primary" />
                    <span className="text-sm">이벤트 진행</span>
                </label>
            </div>
        </div>
    );
}

export function DiscountTypeField({ isPermanent, onPermanentChange, dateValue, onDateChange }: Readonly<{
    isPermanent: boolean;
    onPermanentChange: (v: boolean) => void;
    dateValue: string;
    onDateChange: (v: string) => void;
}>): React.ReactElement {
    return (
        <div className="space-y-3">
            <label className={LABEL_CLASS}>할인 유형 <span className="text-destructive">*</span></label>
            <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="discountType" checked={!isPermanent} onChange={(): void => onPermanentChange(false)} className="accent-brand-primary" />
                    <span className="text-sm">기간 한정 할인</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="discountType" checked={isPermanent} onChange={(): void => onPermanentChange(true)} className="accent-brand-primary" />
                    <span className="text-sm">상시 할인</span>
                </label>
            </div>
            {isPermanent ? (
                <p className="text-xs text-muted-foreground">마감일 없이 항상 할인 가격으로 노출됩니다.</p>
            ) : (
                <div>
                    <label className={LABEL_CLASS}>이벤트 마감일 <span className="text-destructive">*</span></label>
                    <input type="date" value={dateValue} onChange={(e): void => onDateChange(e.target.value)} required={!isPermanent} className={INPUT_CLASS} />
                    <p className="mt-1 text-xs text-muted-foreground">마감일이 지나면 작품이 홈페이지 목록에서 숨겨집니다.</p>
                </div>
            )}
        </div>
    );
}

export function PriceFields({ price, priceOrigin, onPriceChange, onPriceOriginChange }: Readonly<{
    price: string;
    priceOrigin: string;
    onPriceChange: (v: string) => void;
    onPriceOriginChange: (v: string) => void;
}>): React.ReactElement {
    return (
        <>
            <div>
                <label className={LABEL_CLASS}>정가 (원래 가격) <span className="text-destructive">*</span></label>
                <input type="number" min="10000" value={priceOrigin} onChange={(e): void => onPriceOriginChange(e.target.value)} placeholder="정가 (원래 가격)을 입력해주세요" className={INPUT_CLASS} />
            </div>
            <div>
                <label className={LABEL_CLASS}>판매가 <span className="text-destructive">*</span></label>
                <input type="number" min="10000" value={price} onChange={(e): void => onPriceChange(e.target.value)} placeholder="최소 10,000원 이상. 예) 300000" required className={INPUT_CLASS} />
            </div>
        </>
    );
}

export function DescriptionField({ value, onChange, onAiDescribe, aiDescribing }: Readonly<{
    value: string;
    onChange: (v: string) => void;
    onAiDescribe?: () => void;
    aiDescribing?: boolean;
}>): React.ReactElement {
    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="portfolio-description" className="text-sm font-medium">
                    작품 설명글 <span className="text-destructive">*</span>
                </label>
                {onAiDescribe ? (
                    <button
                        type="button"
                        onClick={onAiDescribe}
                        disabled={aiDescribing}
                        aria-busy={aiDescribing ?? false}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-brand-primary/40 px-2.5 py-1 text-xs font-medium text-brand-primary transition-colors hover:bg-brand-primary/10 focus-visible:bg-brand-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        {aiDescribing ? "생성 중…" : "AI로 설명 생성"}
                    </button>
                ) : null}
            </div>
            <textarea
                id="portfolio-description"
                value={value}
                onChange={(e): void => onChange(e.target.value)}
                rows={6}
                required
                placeholder="시술 부위·스타일·특징 등 작품을 자유롭게 설명해주세요. 작성이 어려우면 'AI로 설명 생성'을 이용하세요."
                className={`${INPUT_CLASS} resize-y`}
            />
        </div>
    );
}

// ─── Exhibition Selector ─────────────────────────────────

interface ExhibitionOption {
    id: string;
    title: string;
    subtitle: string | null;
    image_path: string;
    end_at: string | null;
}

function ExhibitionCheckItem({ ex, checked, onToggle }: Readonly<{
    ex: ExhibitionOption; checked: boolean; onToggle: () => void;
}>): React.ReactElement {
    const imageUrl = getStorageUrl(ex.image_path);
    return (
        <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
            checked ? "border-brand-primary bg-brand-primary/5" : "border-input hover:border-brand-primary/50 focus-visible:border-brand-primary/50"
        }`}>
            <input type="checkbox" checked={checked} onChange={onToggle}
                className="h-4 w-4 rounded accent-brand-primary" />
            <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded">
                {imageUrl ? <Image src={imageUrl} alt={ex.title} fill sizes="64px" className="object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ex.title}</p>
                {ex.subtitle ? <p className="truncate text-xs text-muted-foreground">{ex.subtitle}</p> : null}
            </div>
        </label>
    );
}

export function ExhibitionSelector({ selectedIds, onToggle }: Readonly<{
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
}>): React.ReactElement {
    const [exhibitions, setExhibitions] = useState<ExhibitionOption[]>([]);
    const [loading, setLoading] = useState(true);
    const didLoad = useRef(false);

    // @client-reason: 이벤트 진행 토글 시에만 조건부 마운트되는 기획전 선택 목록의 지연 로드. 작품 작성/수정 폼은 controlled client component(PortfolioWriteClient/PortfolioEditClient)이고, 이 목록은 사용자 인터랙션(이벤트 진행 선택)으로만 나타나므로 서버 페칭 대상이 아님.
    useEffect(() => {
        if (didLoad.current) return;
        didLoad.current = true;
        const supabase = createClient();
        const now = new Date().toISOString();
        supabase
            .from("exhibitions")
            .select("id, title, subtitle, image_path, end_at")
            .eq("is_active", true)
            .or(`start_at.is.null,start_at.lte.${now}`)
            .or(`end_at.is.null,end_at.gte.${now}`)
            .order("order_index", { ascending: true })
            .then(({ data }) => {
                setExhibitions((data ?? []) as ExhibitionOption[]);
                setLoading(false);
            });
    }, []);

    if (loading) return <p className="text-xs text-muted-foreground">기획전 로딩 중...</p>;
    if (exhibitions.length === 0) return <p className="text-xs text-muted-foreground">현재 진행 중인 기획전이 없습니다</p>;

    return (
        <div className="space-y-2">
            <label className={LABEL_CLASS}>기획전 선택 (출품할 기획전을 선택하세요)</label>
            <div className="space-y-2">
                {exhibitions.map((ex) => (
                    <ExhibitionCheckItem key={ex.id} ex={ex} checked={selectedIds.has(ex.id)}
                        onToggle={(): void => onToggle(ex.id)} />
                ))}
            </div>
        </div>
    );
}

/** Renders all standard portfolio form fields in order */
export function PortfolioFormFields({
    values, onValuesChange, selectedExhibitionIds, onToggleExhibition, onAiDescribe, aiDescribing,
}: Readonly<{
    values: PortfolioFormValues;
    onValuesChange: (patch: Partial<PortfolioFormValues>) => void;
    selectedExhibitionIds?: Set<string>;
    onToggleExhibition?: (id: string) => void;
    onAiDescribe?: () => void;
    aiDescribing?: boolean;
}>): React.ReactElement {
    return (
        <>
            <TitleField value={values.title} onChange={(title): void => onValuesChange({ title })} />
            <EventToggleField isEvent={values.isEvent} onChange={(isEvent): void => onValuesChange({ isEvent })} />
            {values.isEvent ? (
                <>
                    <DiscountTypeField
                        isPermanent={values.isPermanentDiscount}
                        onPermanentChange={(isPermanentDiscount): void => onValuesChange({ isPermanentDiscount, saleEndedAt: isPermanentDiscount ? "" : values.saleEndedAt })}
                        dateValue={values.saleEndedAt}
                        onDateChange={(saleEndedAt): void => onValuesChange({ saleEndedAt })}
                    />
                    {selectedExhibitionIds && onToggleExhibition ? (
                        <ExhibitionSelector selectedIds={selectedExhibitionIds} onToggle={onToggleExhibition} />
                    ) : null}
                </>
            ) : null}
            <PriceFields
                price={values.price}
                priceOrigin={values.priceOrigin}
                onPriceChange={(price): void => onValuesChange({ price })}
                onPriceOriginChange={(priceOrigin): void => onValuesChange({ priceOrigin })}
            />
            <DescriptionField
                value={values.description}
                onChange={(description): void => onValuesChange({ description })}
                onAiDescribe={onAiDescribe}
                aiDescribing={aiDescribing}
            />
        </>
    );
}
