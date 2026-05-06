// @client-reason: Canvas direct pixel manipulation, pointer events for brush painting
"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Upload, Download, Eraser, Paintbrush, RotateCcw, Minus, Plus, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LandmarkData } from "@/lib/eyebrow-renderer";

const MAX_CANVAS = 2048;

// ─── Upload Step ───────────────────────────────────────────────────────────

function ConcealerUpload({ inputRef, onFile, error }: Readonly<{
    inputRef: React.RefObject<HTMLInputElement | null>;
    onFile: (f: File) => void;
    error: string | null;
}>): React.ReactElement {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <button
                type="button"
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-input px-12 py-16 transition-colors hover:border-rose-400 hover:bg-rose-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-rose-950/20"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
            >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium">사진을 올려주세요</p>
                <p className="text-xs text-muted-foreground">눈썹을 지울 정면 얼굴 사진</p>
            </button>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <p className="max-w-sm text-center text-xs text-muted-foreground">
                여기서 눈썹을 지운 후 저장하면, 시뮬레이션 페이지에서 깨끗한 사진으로 템플릿을 올릴 수 있습니다.
            </p>
        </div>
    );
}

// ─── Toolbar ───────────────────────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function -- Toolbar with auto-erase, brush controls, size adjustment, action buttons
function ConcealerToolbar({ brushMode, brushSize, onToggleBrush, onSizeChange, onAutoErase, onReset, onDownload, onNewPhoto }: Readonly<{
    brushMode: boolean;
    brushSize: number;
    onToggleBrush: () => void;
    onSizeChange: (s: number) => void;
    onAutoErase: () => void;
    onReset: () => void;
    onDownload: () => void;
    onNewPhoto: () => void;
}>): React.ReactElement {
    return (
        <div className="flex w-60 shrink-0 flex-col gap-4 border-l p-4">
            <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">1단계: 자동 지우기</p>
                <Button variant="outline" className="w-full gap-2" onClick={onAutoErase} aria-label="AI 자동 눈썹 지우기">
                    <Eraser className="h-4 w-4" />AI 자동 지우기
                </Button>
                <p className="mt-1 text-[10px] text-muted-foreground">AI가 감지한 눈썹을 자동 블러</p>
            </div>

            <div className="border-t pt-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">2단계: 수동 터치업</p>
                <button
                    type="button"
                    aria-pressed={brushMode}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        brushMode ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80 focus-visible:bg-muted/80"
                    }`}
                    onClick={onToggleBrush}
                >
                    <Paintbrush className="h-4 w-4" />
                    {brushMode ? "컨실러 ON" : "컨실러 OFF"}
                </button>
                {brushMode ? (
                    <div className="mt-3 space-y-1">
                        <p className="text-[10px] text-rose-500">사진 위를 칠해서 남은 눈썹을 지우세요</p>
                        <div className="flex items-center justify-center gap-2">
                            <button
                                type="button"
                                aria-label="브러시 크기 줄이기"
                                className="rounded-md p-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted"
                                onClick={() => onSizeChange(Math.max(5, brushSize - 5))}
                            >
                                <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-12 text-center text-sm">{brushSize}px</span>
                            <button
                                type="button"
                                aria-label="브러시 크기 늘리기"
                                className="rounded-md p-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted"
                                onClick={() => onSizeChange(Math.min(60, brushSize + 5))}
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="mt-auto flex flex-col gap-2 border-t pt-4">
                <Button variant="outline" className="gap-2" onClick={onReset} aria-label="원본 복원">
                    <RotateCcw className="h-4 w-4" />원본 복원
                </Button>
                <Button className="gap-2 bg-rose-500 text-white hover:bg-rose-600 focus-visible:ring-rose-500" onClick={onDownload} aria-label="사진 저장">
                    <Download className="h-4 w-4" />사진 저장
                </Button>
                <Button variant="ghost" className="gap-2" onClick={onNewPhoto} aria-label="새 사진 업로드">
                    <Upload className="h-4 w-4" />새 사진
                </Button>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function -- Standalone concealer: canvas management, pointer events, face analysis, toolbar coordination
export function ConcealerClient(): React.ReactElement {
    const [step, setStep] = useState<"upload" | "analyzing" | "editing">("upload");
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const landmarksRef = useRef<LandmarkData | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [brushMode, setBrushMode] = useState(false);
    const [brushSize, setBrushSize] = useState(20);
    const isPaintingRef = useRef(false);
    const blurredRef = useRef<HTMLCanvasElement | null>(null);

    const prepareBlurred = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const lm = landmarksRef.current;
        const w = canvas.width;
        const h = canvas.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let skinColor = "rgb(210,185,165)";
        if (lm) {
            void import("@/lib/brow-eraser").then(({ sampleSkinTone }) => {
                skinColor = sampleSkinTone(ctx, lm.points, w, h);
            });
        }

        const b1 = document.createElement("canvas");
        b1.width = w; b1.height = h;
        const b1c = b1.getContext("2d");
        if (!b1c) return;
        b1c.filter = "blur(20px)";
        b1c.drawImage(canvas, 0, 0);
        b1c.filter = "none";
        b1c.globalAlpha = 0.35;
        b1c.fillStyle = skinColor;
        b1c.fillRect(0, 0, w, h);
        b1c.globalAlpha = 1.0;

        const b2 = document.createElement("canvas");
        b2.width = w; b2.height = h;
        const b2c = b2.getContext("2d");
        if (!b2c) return;
        b2c.filter = "blur(10px)";
        b2c.drawImage(b1, 0, 0);
        b2c.filter = "none";

        blurredRef.current = b2;
    }, []);

    const onFile = useCallback(async (file: File) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result as string;
            setStep("analyzing");
            setError(null);

            try {
                const { initFaceAnalysis, analyzeFace, loadImage } = await import("@/lib/face-analysis");
                await initFaceAnalysis();
                const img = await loadImage(dataUrl);
                imageRef.current = img;

                const result = analyzeFace(img);
                if (!result) {
                    setError("얼굴을 감지하지 못했습니다. 정면 사진을 올려주세요.");
                    setStep("upload");
                    return;
                }
                landmarksRef.current = result.landmarks;

                const canvas = canvasRef.current;
                if (!canvas) return;
                const scale = Math.min(1, MAX_CANVAS / Math.max(img.naturalWidth, img.naturalHeight));
                canvas.width = Math.round(img.naturalWidth * scale);
                canvas.height = Math.round(img.naturalHeight * scale);
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                prepareBlurred();
                setStep("editing");
            } catch {
                setError("얼굴 분석 중 오류가 발생했습니다.");
                setStep("upload");
            }
        };
        reader.readAsDataURL(file);
    }, [prepareBlurred]);

    const handleAutoErase = useCallback(async () => {
        const canvas = canvasRef.current;
        const lm = landmarksRef.current;
        if (!canvas || !lm) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const { eraseBrowRegion } = await import("@/lib/brow-eraser");
        eraseBrowRegion(ctx, canvas, lm.points, canvas.width, canvas.height);
        prepareBlurred();
    }, [prepareBlurred]);

    const handleReset = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        prepareBlurred();
    }, [prepareBlurred]);

    const handleDownload = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `concealed-${Date.now()}.png`;
        a.click();
    }, []);

    const getCoord = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
        };
    }, []);

    const paintAt = useCallback((x: number, y: number) => {
        const canvas = canvasRef.current;
        const blurred = blurredRef.current;
        if (!canvas || !blurred) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const r = brushSize * (canvas.width / rect.width);

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = 0.55;
        ctx.drawImage(blurred, 0, 0);
        ctx.restore();
    }, [brushSize]);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!brushMode) return;
        isPaintingRef.current = true;
        const { x, y } = getCoord(e);
        paintAt(x, y);
        e.currentTarget.setPointerCapture(e.pointerId);
    }, [brushMode, getCoord, paintAt]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!brushMode || !isPaintingRef.current) return;
        const { x, y } = getCoord(e);
        paintAt(x, y);
    }, [brushMode, getCoord, paintAt]);

    const handlePointerUp = useCallback(() => {
        isPaintingRef.current = false;
    }, []);

    return (
        <div className="flex h-full flex-col">
            <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/pro/beauty-sim/v2"
                        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="V2로 돌아가기"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Eraser className="h-4 w-4 text-rose-500" />
                        <span className="text-sm font-semibold">눈썹 컨실러</span>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900 dark:text-rose-300">독립 도구</span>
                    </div>
                </div>
                <Link
                    href="/"
                    className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="홈으로"
                >
                    <Home className="h-4 w-4" />
                </Link>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="flex flex-1 items-center justify-center bg-muted/30 p-4">
                    {step === "upload" ? (
                        <ConcealerUpload inputRef={inputRef} onFile={onFile} error={error} />
                    ) : null}
                    {step === "analyzing" ? (
                        <div className="flex flex-col items-center gap-3">
                            <Eraser className="h-10 w-10 animate-pulse text-rose-500" />
                            <p className="text-sm font-medium">얼굴 분석 중...</p>
                        </div>
                    ) : null}
                    <canvas
                        ref={canvasRef}
                        className={`max-h-full max-w-full ${step !== "editing" ? "hidden" : ""} ${brushMode ? "cursor-crosshair touch-none" : ""}`}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    />
                </div>

                {step === "editing" ? (
                    <ConcealerToolbar
                        brushMode={brushMode}
                        brushSize={brushSize}
                        onToggleBrush={() => setBrushMode((p) => !p)}
                        onSizeChange={setBrushSize}
                        onAutoErase={() => { void handleAutoErase(); }}
                        onReset={handleReset}
                        onDownload={handleDownload}
                        onNewPhoto={() => { setStep("upload"); setError(null); setBrushMode(false); }}
                    />
                ) : null}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
            />
        </div>
    );
}
