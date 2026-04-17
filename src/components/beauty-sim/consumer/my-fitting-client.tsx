// @client-reason: Camera capture, file upload, MediaPipe face analysis, step-based UI
"use client";

import { useState, useCallback, useRef } from "react";
import { ArrowLeft, Brain, Camera, ImagePlus } from "lucide-react";
import type { LandmarkData } from "@/lib/eyebrow-renderer";
import { FittingRoom } from "./fitting-room";

// ─── Types ──────────────────────────────────────────────────────────────────

type MyStep = "upload" | "analyzing" | "fitting";

// ─── Image Analysis Helper ──────────────────────────────────────────────────

const MAX_INPUT = 2048;

/** Resize image to fit within MAX_INPUT for reliable MediaPipe analysis and canvas rendering */
function resizeImage(img: HTMLImageElement): { canvas: HTMLCanvasElement; resizedImg: Promise<HTMLImageElement> } {
    const scale = Math.min(1, MAX_INPUT / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const resizedImg = new Promise<HTMLImageElement>((resolve, reject) => {
        const newImg = new Image();
        newImg.onload = () => resolve(newImg);
        newImg.onerror = reject;
        newImg.src = dataUrl;
    });

    return { canvas, resizedImg };
}

async function analyzeImage(img: HTMLImageElement): Promise<{
    dataUrl: string;
    img: HTMLImageElement;
    landmarks: LandmarkData;
} | null> {
    const { initFaceAnalysis, analyzeFace } = await import("@/lib/face-analysis");
    await initFaceAnalysis();

    // Resize large phone photos (4032×3024 etc.) to max 2048px for reliable analysis
    const { canvas, resizedImg } = resizeImage(img);
    const scaledImg = await resizedImg;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    const result = analyzeFace(scaledImg);
    if (!result) return null;

    return { dataUrl, img: scaledImg, landmarks: result.landmarks };
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function UploadHeader({ onBack }: Readonly<{ onBack: () => void }>): React.ReactElement {
    return (
        <header className="fixed left-0 right-0 top-0 z-40 px-4 py-4">
            <div className="mx-auto flex max-w-lg items-center">
                <button
                    type="button"
                    aria-label="뒤로 가기"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/20"
                    onClick={onBack}
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
}

function AnalyzingStep(): React.ReactElement {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
            <Brain className="h-12 w-12 animate-pulse text-pink-500" aria-hidden="true" />
            <p className="text-lg font-medium text-white">얼굴을 분석하는 중...</p>
            <p className="text-sm text-white/60">얼굴형, 눈썹, 눈매를 읽고 있습니다</p>
        </div>
    );
}

const UPLOAD_BTN = "flex w-full items-center gap-4 rounded-2xl border border-white/20 bg-white/5 p-5 text-left transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/10";

// ─── Main Component ─────────────────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function -- Upload + camera + analysis + fitting room orchestrator
export function MyFittingClient(): React.ReactElement {
    const [step, setStep] = useState<MyStep>("upload");
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [landmarks, setLandmarks] = useState<LandmarkData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const processFile = useCallback(async (file: File) => {
        setStep("analyzing");
        setError(null);

        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const img = await loadImageFromDataUrl(dataUrl);
            const result = await analyzeImage(img);

            if (!result) {
                setError("얼굴을 감지하지 못했습니다. 정면 사진을 사용해주세요.");
                setStep("upload");
                return;
            }

            setImageDataUrl(result.dataUrl);
            setImage(result.img);
            setLandmarks(result.landmarks);
            setStep("fitting");
        } catch {
            setError("이미지 처리 중 오류가 발생했습니다.");
            setStep("upload");
        }
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) void processFile(file);
        e.target.value = "";
    }, [processFile]);

    const handleReset = useCallback(() => {
        setStep("upload");
        setImageDataUrl(null);
        setImage(null);
        setLandmarks(null);
        setError(null);
    }, []);

    const handleBack = useCallback(() => {
        globalThis.history.back();
    }, []);

    if (step === "analyzing") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <AnalyzingStep />
            </div>
        );
    }

    if (step === "fitting" && imageDataUrl && image && landmarks) {
        return (
            <FittingRoom
                imageDataUrl={imageDataUrl}
                image={image}
                landmarks={landmarks}
                vibeName="내 얼굴"
                onBack={handleReset}
            />
        );
    }

    return (
        <>
            <UploadHeader onBack={handleBack} />
            <div className="px-4 pb-12 pt-24">
                <div className="mx-auto max-w-lg">
                    {error ? (
                        <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-300">
                            {error}
                        </p>
                    ) : null}

                    <div className="mb-8 text-center">
                        <h1 className="mb-3 text-3xl font-bold text-white md:text-4xl">내 얼굴 피팅</h1>
                        <p className="text-white/60">내 사진으로 눈썹 스타일을 미리 체험해보세요</p>
                    </div>

                    <div className="space-y-4">
                        <button
                            type="button"
                            className={UPLOAD_BTN}
                            onClick={() => cameraInputRef.current?.click()}
                        >
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500">
                                <Camera className="h-7 w-7 text-white" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-base font-semibold text-white">카메라로 촬영하기</p>
                                <p className="text-sm text-white/50">지금 바로 정면 셀카를 찍어주세요</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            className={UPLOAD_BTN}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500">
                                <ImagePlus className="h-7 w-7 text-white" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-base font-semibold text-white">앨범에서 선택하기</p>
                                <p className="text-sm text-white/50">정면이 잘 보이는 사진을 선택해주세요</p>
                            </div>
                        </button>
                    </div>

                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={handleFileChange}
                        aria-label="카메라 촬영"
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        aria-label="이미지 업로드"
                    />

                    <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                        <h2 className="mb-3 text-lg font-bold text-white">촬영 가이드</h2>
                        <ul className="space-y-2 text-sm text-white/60">
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 text-pink-400">1.</span>
                                <span>정면을 바라보고 자연스러운 표정으로 촬영해주세요</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 text-pink-400">2.</span>
                                <span>앞머리가 눈썹을 가리지 않도록 해주세요</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 text-pink-400">3.</span>
                                <span>밝은 곳에서 촬영하면 더 정확한 결과를 얻을 수 있습니다</span>
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        </>
    );
}
