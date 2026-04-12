// @client-reason: Face analysis via MediaPipe, step-based UI transitions
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Brain, CircleCheckBig, Sparkles, Palette, Heart, Crown, Leaf, Glasses, Flame, Gem } from "lucide-react";
import type { LandmarkData } from "@/lib/eyebrow-renderer";
import { FittingRoom } from "./fitting-room";

// ─── Types ──────────────────────────────────────────────────────────────────

type SimStep = "select" | "analyzing" | "fitting";

interface VibeInfo {
    readonly id: string;
    readonly icon: typeof Sparkles;
    readonly title: string;
    readonly desc: string;
    readonly modelImage: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SUPABASE_STORAGE = "https://bhcascuuecgwlxujtpkx.supabase.co/storage/v1/object/public/models";

const FEMALE_VIBES: readonly VibeInfo[] = [
    { id: "f-natural", icon: Sparkles, title: "청순/내추럴", desc: "자연스럽고 깨끗한 눈썹 라인", modelImage: `${SUPABASE_STORAGE}/model-1.webp` },
    { id: "f-chic", icon: Palette, title: "시크/개성", desc: "날카롭고 세련된 아치형 눈썹", modelImage: `${SUPABASE_STORAGE}/model-2.webp` },
    { id: "f-lovely", icon: Heart, title: "러블리/큐티", desc: "부드러운 곡선의 둥근 눈썹", modelImage: `${SUPABASE_STORAGE}/model-3.webp` },
    { id: "f-luxury", icon: Crown, title: "고급/도시", desc: "정돈된 고급스러운 눈썹 디자인", modelImage: `${SUPABASE_STORAGE}/model-4.webp` },
] as const;

const MALE_VIBES: readonly VibeInfo[] = [
    { id: "m-soft", icon: Leaf, title: "소프트/내추럴", desc: "자연스러운 남성 눈썹 라인", modelImage: `${SUPABASE_STORAGE}/male-model-1.webp` },
    { id: "m-dandy", icon: Glasses, title: "댄디/지적", desc: "깔끔하게 정돈된 직선 눈썹", modelImage: `${SUPABASE_STORAGE}/male-model-2.webp` },
    { id: "m-tough", icon: Flame, title: "카리스마/터프", desc: "굵고 진한 남성적인 눈썹", modelImage: `${SUPABASE_STORAGE}/male-model-3.webp` },
    { id: "m-trendy", icon: Gem, title: "시크/트렌디", desc: "트렌디한 각도의 세련된 눈썹", modelImage: `${SUPABASE_STORAGE}/male-model-4.webp` },
] as const;

const INFO_POINTS = [
    "시술 전 내 얼굴에 직접 미리보기",
    "30가지 이상의 눈썹 템플릿 무료 체험",
    "입술 컬러 시뮬레이션까지 한번에",
] as const;

// ─── Sub-components ─────────────────────────────────────────────────────────


function GenderToggle({ gender, onChange }: Readonly<{
    gender: "female" | "male";
    onChange: (g: "female" | "male") => void;
}>): React.ReactElement {
    return (
        <div className="mb-6 flex items-center justify-between">
            <Link
                href="/"
                className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-2 text-sm text-white/70 transition-colors hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                홈으로
            </Link>
            <div className="relative inline-flex rounded-full border border-white/20 bg-white/5 p-1">
                <button
                    type="button"
                    aria-pressed={gender === "female"}
                    className={`relative z-10 rounded-full px-6 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        gender === "female" ? "bg-white text-black" : "text-white/50 hover:text-white/70 focus-visible:text-white/70"
                    }`}
                    onClick={() => onChange("female")}
                >
                    여성
                </button>
                <button
                    type="button"
                    aria-pressed={gender === "male"}
                    className={`relative z-10 rounded-full px-6 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        gender === "male" ? "bg-white text-black" : "text-white/50 hover:text-white/70 focus-visible:text-white/70"
                    }`}
                    onClick={() => onChange("male")}
                >
                    남성
                </button>
            </div>
            <div className="w-[68px]" />
        </div>
    );
}


function VibeCard({ vibe, onClick }: Readonly<{
    vibe: VibeInfo;
    onClick: () => void;
}>): React.ReactElement {
    const Icon = vibe.icon;
    return (
        <button
            type="button"
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 transition-all hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            onClick={onClick}
            aria-label={`${vibe.title} 분위기 선택`}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/5">
                    <Icon className="h-7 w-7 text-white" aria-hidden="true" />
                </div>
                <h3 className="mb-1.5 text-lg font-bold text-white">{vibe.title}</h3>
                <p className="text-sm text-white/50">{vibe.desc}</p>
            </div>
        </button>
    );
}

function VibeGrid({ vibes, onSelect }: Readonly<{
    vibes: readonly VibeInfo[];
    onSelect: (vibe: VibeInfo) => void;
}>): React.ReactElement {
    return (
        <div className="grid grid-cols-2 gap-3">
            {vibes.map((v) => (
                <VibeCard key={v.id} vibe={v} onClick={() => onSelect(v)} />
            ))}
        </div>
    );
}

function InfoSection(): React.ReactElement {
    return (
        <section className="mt-12 rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">눈썹 시뮬레이션 안내</h2>
            <p className="mb-5 text-sm leading-relaxed text-white/50">
                반영구 눈썹 시술 전, 내 얼굴에 다양한 눈썹 디자인을 직접 올려볼 수 있습니다.
                헤어스트록, 엠보, 콤보 등 30가지 이상의 템플릿과 20가지 입술 컬러를
                무료로 체험해보세요.
            </p>
            <ul className="space-y-3">
                {INFO_POINTS.map((point) => (
                    <li key={point} className="flex items-center gap-3 text-sm text-white/60">
                        <CircleCheckBig className="h-5 w-5 shrink-0 text-white" aria-hidden="true" />
                        {point}
                    </li>
                ))}
            </ul>
        </section>
    );
}

function AnalyzingStep({ onBack }: Readonly<{ onBack: () => void }>): React.ReactElement {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
            <button
                type="button"
                aria-label="뒤로 가기"
                className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={onBack}
            >
                <ArrowLeft className="h-5 w-5" />
            </button>
            <Brain className="h-12 w-12 animate-pulse text-white" aria-hidden="true" />
            <p className="text-lg font-medium text-white">얼굴을 분석하는 중...</p>
            <p className="text-sm text-white/40">얼굴형, 눈썹, 눈매를 읽고 있습니다</p>
        </div>
    );
}

// ─── Image Analysis Helper ──────────────────────────────────────────────────

async function analyzeImageUrl(imageUrl: string): Promise<{
    dataUrl: string;
    img: HTMLImageElement;
    landmarks: LandmarkData;
} | null> {
    const { initFaceAnalysis, analyzeFace, loadImage } = await import("@/lib/face-analysis");
    await initFaceAnalysis();
    const img = await loadImage(imageUrl);

    // Convert to data URL for BeforeAfterSlider
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    const result = analyzeFace(img);
    if (!result) return null;

    return { dataUrl, img, landmarks: result.landmarks };
}

// ─── Main Component ─────────────────────────────────────────────────────────

const SESSION_KEY = "beauty-sim-vibe";

// eslint-disable-next-line max-lines-per-function -- Orchestrates model loading, upload, face analysis, and fitting room steps
export function ConsumerBeautySimClient(): React.ReactElement {
    const [step, setStep] = useState<SimStep>("select");
    const [gender, setGender] = useState<"female" | "male">("female");
    const [selectedVibeName, setSelectedVibeName] = useState("청순/내추럴");
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [landmarks, setLandmarks] = useState<LandmarkData | null>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);

    const vibes = gender === "female" ? FEMALE_VIBES : MALE_VIBES;

    // ─── Load model image for vibe (no upload needed) ─────────────────────

    const handleVibeSelect = useCallback(async (vibe: VibeInfo) => {
        setSelectedVibeName(vibe.title);
        setStep("analyzing");
        setError(null);

        try {
            const result = await analyzeImageUrl(vibe.modelImage);
            if (!result) {
                setError("모델 얼굴을 감지하지 못했습니다.");
                setStep("select");
                return;
            }
            setImageDataUrl(result.dataUrl);
            setImage(result.img);
            setLandmarks(result.landmarks);
            setStep("fitting");
            // Persist vibe ID for refresh recovery
            try { globalThis.sessionStorage?.setItem(SESSION_KEY, vibe.id); } catch {}
        } catch {
            setError("모델 이미지 로딩 중 오류가 발생했습니다.");
            setStep("select");
        }
    }, []);

    // Restore fitting room on refresh — re-analyze stored vibe
    const restoredRef = useRef(false);
    useEffect(() => {
        if (restoredRef.current) return;
        restoredRef.current = true;
        try {
            const savedId = globalThis.sessionStorage?.getItem(SESSION_KEY);
            if (!savedId) return;
            const allVibes = [...FEMALE_VIBES, ...MALE_VIBES];
            const vibe = allVibes.find((v) => v.id === savedId);
            if (!vibe) return;
            // Defer to avoid synchronous setState in effect
            queueMicrotask(() => { void handleVibeSelect(vibe); });
        } catch {}
    }, [handleVibeSelect]);

    const onReset = useCallback(() => {
        setStep("select");
        setImageDataUrl(null);
        setError(null);
        setLandmarks(null);
        setImage(null);
        try { globalThis.sessionStorage?.removeItem(SESSION_KEY); } catch {}
    }, []);

    return (
        <>
            {step === "select" ? (
                <>
                    <div className="px-4 pb-12 pt-8">
                        <div className="mx-auto max-w-lg">
                            {error ? (
                                <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-300">
                                    {error}
                                </p>
                            ) : null}

                            <GenderToggle gender={gender} onChange={setGender} />
                            <VibeGrid vibes={vibes} onSelect={handleVibeSelect} />

                            <p className="mt-6 text-center text-sm text-white/30">
                                분위기를 선택하면 피팅룸으로 이동합니다
                            </p>

                            <InfoSection />
                        </div>
                    </div>
                </>
            ) : null}

            {step === "analyzing" ? <AnalyzingStep onBack={onReset} /> : null}

            {step === "fitting" && imageDataUrl && image && landmarks ? (
                <FittingRoom
                    imageDataUrl={imageDataUrl}
                    image={image}
                    landmarks={landmarks}
                    vibeName={selectedVibeName}
                    onBack={onReset}
                />
            ) : null}

        </>
    );
}
