// @client-reason: useState for active tab, useRef for scroll-based tab switching, image carousel interaction
"use client";

import { STRINGS } from "@/lib/strings";
import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Clock, Users, Tag, Star, Instagram, ChevronLeft, ChevronRight, Phone, ArrowLeft } from "lucide-react";
import type { CourseDetail } from "@/lib/supabase/course-queries";
type TabKey = "highlights" | "curriculum" | "reviews" | "artistInfo";

const t = STRINGS.courseDetail;

export function CourseDetailClient({ course }: Readonly<{
    course: CourseDetail;
}>): React.ReactElement {
    return (
        <div className="mx-auto w-full max-w-[767px] pb-24">
            <BackButton />
            <ImageCarousel images={course.images} title={course.title} />
            <CourseHeader course={course} />
            <StickyTabs>
                {(activeTab) => (
                    <>
                        {activeTab === "highlights" && <HighlightsSection highlights={course.highlights} />}
                        {activeTab === "curriculum" && <CurriculumSection curriculum={course.curriculum} />}
                        {activeTab === "reviews" && <ReviewsSection reviews={course.reviews} summary={course.reviewSummary} />}
                        {activeTab === "artistInfo" && <ArtistSection course={course} />}
                    </>
                )}
            </StickyTabs>
            <CourseBottomBar kakaoUrl={course.artistKakaoUrl} contact={course.artistContact} />
        </div>
    );
}

function ImageCarousel({ images, title }: Readonly<{
    images: CourseDetail["images"];
    title: string;
}>): React.ReactElement {
    const [current, setCurrent] = useState(0);
    const total = images.length;

    const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);
    const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);

    if (total === 0) {
        return <div className="aspect-[4/3] w-full bg-muted" />;
    }

    return (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
            <Image
                src={images.at(current)?.imageUrl ?? ""}
                alt={`${title} ${current + 1}`}
                fill
                sizes="(max-width: 767px) 100vw, 512px"
                className="object-cover"
                priority={current === 0}
            />
            {total > 1 && (
                <>
                    <CarouselButton direction="left" onClick={prev} />
                    <CarouselButton direction="right" onClick={next} />
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                        {current + 1} / {total}
                    </div>
                </>
            )}
        </div>
    );
}

function CarouselButton({ direction, onClick }: Readonly<{
    direction: "left" | "right";
    onClick: () => void;
}>): React.ReactElement {
    const Icon = direction === "left" ? ChevronLeft : ChevronRight;
    const posClass = direction === "left" ? "left-2" : "right-2";

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={direction === "left" ? "Previous image" : "Next image"}
            className={`absolute top-1/2 ${posClass} -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        >
            <Icon className="h-5 w-5" aria-hidden="true" />
        </button>
    );
}

function CourseHeader({ course }: Readonly<{
    course: CourseDetail;
}>): React.ReactElement {
    return (
        <div className="space-y-3 px-4 pt-4">
            <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-semibold text-brand-primary">
                    {course.category}
                </span>
                <span className="text-xs text-muted-foreground">{course.classType}</span>
            </div>

            <h1 className="text-xl font-bold">{course.title}</h1>

            {course.description ? (
                <p className="text-sm text-muted-foreground">{course.description}</p>
            ) : null}

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <InfoBadge icon={MapPin} text={course.location} />
                <InfoBadge icon={Clock} text={course.duration} />
                <InfoBadge icon={Users} text={course.classType} />
                <InfoBadge icon={Tag} text={course.category} />
            </div>

            <PriceDisplay course={course} />
        </div>
    );
}

function InfoBadge({ icon: Icon, text }: Readonly<{
    icon: typeof MapPin;
    text: string;
}>): React.ReactElement {
    return (
        <span className="flex items-center gap-1">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {text}
        </span>
    );
}

function PriceDisplay({ course }: Readonly<{
    course: CourseDetail;
}>): React.ReactElement {
    return (
        <div className="flex items-baseline gap-2 pb-3">
            {course.discountRate > 0 && (
                <span className="text-lg font-bold text-red-500">{course.discountRate}%</span>
            )}
            <span className="text-2xl font-bold">
                {t.pricePerMonth} {course.price}{t.tenThousandWon}
            </span>
            {course.originalPrice && course.discountRate > 0 ? (
                <span className="text-sm text-muted-foreground line-through">
                    {course.originalPrice}{t.tenThousandWon}
                </span>
            ) : null}
        </div>
    );
}

function StickyTabs({ children }: Readonly<{
    children: (activeTab: TabKey) => React.ReactNode;
}>): React.ReactElement {
    const [activeTab, setActiveTab] = useState<TabKey>("highlights");
    const tabs: { key: TabKey; label: string }[] = [
        { key: "highlights", label: t.highlights },
        { key: "curriculum", label: t.curriculum },
        { key: "reviews", label: t.reviews },
        { key: "artistInfo", label: t.artistInfo },
    ];

    return (
        <>
            <nav
                className="sticky top-0 z-20 flex border-b border-border bg-background"
                aria-label="Course sections"
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 px-2 py-3 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            activeTab === tab.key
                                ? "border-b-2 border-brand-primary text-brand-primary"
                                : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"
                        }`}
                        aria-pressed={activeTab === tab.key}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
            <div className="min-h-[50vh]">{children(activeTab)}</div>
        </>
    );
}

function HighlightsSection({ highlights }: Readonly<{
    highlights: CourseDetail["highlights"];
}>): React.ReactElement {
    return (
        <section className="space-y-6 px-4 py-6" aria-label={t.highlights}>
            {highlights.map((h) => (
                <HighlightCard key={h.orderIndex} highlight={h} />
            ))}
        </section>
    );
}

function HighlightCard({ highlight }: Readonly<{
    highlight: CourseDetail["highlights"][number];
}>): React.ReactElement {
    return (
        <div className="overflow-hidden rounded-xl border border-border">
            {highlight.imageUrl ? (
                <div className="relative aspect-video w-full bg-muted">
                    <Image
                        src={highlight.imageUrl}
                        alt={highlight.title}
                        fill
                        sizes="(max-width: 767px) 100vw, 512px"
                        className="object-cover"
                        loading="lazy"
                    />
                </div>
            ) : null}
            <div className="space-y-1 p-4">
                <h3 className="font-bold">{highlight.title}</h3>
                <p className="text-sm text-muted-foreground">{highlight.description}</p>
            </div>
        </div>
    );
}

function CurriculumSection({ curriculum }: Readonly<{
    curriculum: CourseDetail["curriculum"];
}>): React.ReactElement {
    return (
        <section className="px-4 py-6" aria-label={t.curriculum}>
            <ol className="space-y-3">
                {curriculum.map((ch) => (
                    <li key={ch.chapterNumber} className="flex items-start gap-3 rounded-lg border border-border p-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">
                            {ch.chapterNumber}
                        </span>
                        <div>
                            <p className="text-xs text-muted-foreground">{t.chapter} {ch.chapterNumber}</p>
                            <p className="font-medium">{ch.title}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function ReviewsSection({ reviews, summary }: Readonly<{
    reviews: CourseDetail["reviews"];
    summary: CourseDetail["reviewSummary"];
}>): React.ReactElement {
    return (
        <section className="space-y-4 px-4 py-6" aria-label={t.reviews}>
            {summary.count > 0 ? (
                <>
                    <ReviewSummaryCard summary={summary} />
                    <div className="space-y-3">
                        {reviews.map((review) => (
                            <ReviewCard key={review.id} review={review} />
                        ))}
                    </div>
                </>
            ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">{t.noReviews}</p>
            )}
        </section>
    );
}

function ReviewSummaryCard({ summary }: Readonly<{
    summary: CourseDetail["reviewSummary"];
}>): React.ReactElement {
    const overall = Math.round(((summary.avgSatisfaction + summary.avgCleanliness + summary.avgKindness) / 3) * 10) / 10;

    return (
        <div className="rounded-xl bg-muted/50 p-4">
            <div className="mb-3 flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                <span className="text-xl font-bold">{overall}</span>
                <span className="text-sm text-muted-foreground">({summary.count})</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <RatingItem label={t.satisfaction} value={summary.avgSatisfaction} />
                <RatingItem label={t.cleanliness} value={summary.avgCleanliness} />
                <RatingItem label={t.kindness} value={summary.avgKindness} />
            </div>
        </div>
    );
}

function RatingItem({ label, value }: Readonly<{
    label: string;
    value: number;
}>): React.ReactElement {
    return (
        <div>
            <p className="text-muted-foreground">{label}</p>
            <p className="font-bold">{value}</p>
        </div>
    );
}

function ReviewCard({ review }: Readonly<{
    review: CourseDetail["reviews"][number];
}>): React.ReactElement {
    const avg = Math.round(((review.satisfaction + review.cleanliness + review.kindness) / 3) * 10) / 10;

    return (
        <div className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{review.userName}</span>
                <div className="flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                    <span>{avg}</span>
                </div>
            </div>
            {review.content ? (
                <p className="text-sm text-muted-foreground">{review.content}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
            </p>
        </div>
    );
}

function ArtistSection({ course }: Readonly<{
    course: CourseDetail;
}>): React.ReactElement {

    return (
        <section className="space-y-4 px-4 py-6" aria-label={t.artistInfo}>
            <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
                    {course.artistProfileImage ? (
                        <Image
                            src={course.artistProfileImage}
                            alt={course.artistName}
                            fill
                            sizes="64px"
                            className="object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-bold text-muted-foreground">
                            {course.artistName.charAt(0)}
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="text-lg font-bold">{course.artistName}</h3>
                    <p className="text-sm text-muted-foreground">{course.location}</p>
                </div>
            </div>

            {course.artistIntroduce ? (
                <p className="text-sm text-muted-foreground">{course.artistIntroduce}</p>
            ) : null}

            {course.artistInstagram ? (
                <Link
                    href={course.artistInstagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <Instagram className="h-4 w-4" aria-hidden="true" />
                    {t.viewInstagram}
                </Link>
            ) : null}
        </section>
    );
}

function BackButton(): React.ReactElement {
    return (
        <button
            type="button"
            onClick={() => globalThis.history.back()}
            className="absolute left-2 top-2 z-30 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="뒤로 가기"
        >
            <ArrowLeft className="h-5 w-5" />
        </button>
    );
}

const CONTACT_BTN = "flex h-9 flex-1 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";

function CourseBottomBar({ kakaoUrl, contact }: Readonly<{
    kakaoUrl?: string | null; contact?: string | null;
}>): React.ReactElement {
    const hasKakao = !!kakaoUrl;
    const hasContact = !!contact;
    if (!hasKakao && !hasContact) return <></>;

    return (
        <div className="fixed bottom-0 left-1/2 w-full max-w-[767px] -translate-x-1/2 border-t bg-background p-2">
            <div className="flex items-center gap-1.5">
                {hasKakao ? (
                    <a href={kakaoUrl} target="_blank" rel="noopener noreferrer" className={CONTACT_BTN} aria-label="카카오톡">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.21 4.65 6.58-.15.55-.58 2.07-.66 2.39-.1.4.15.39.31.28.13-.08 2.02-1.37 2.84-1.93.9.13 1.83.2 2.79.2 5.52 0 10-3.58 10-7.52C22 6.58 17.52 3 12 3z" />
                        </svg>
                    </a>
                ) : null}
                {hasContact ? (
                    <a href={`tel:${contact}`} className={`${CONTACT_BTN} text-foreground`} aria-label="전화">
                        <Phone className="h-4 w-4" />
                    </a>
                ) : null}
            </div>
        </div>
    );
}
