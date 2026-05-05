// @client-reason: Canvas rendering, slider interactions, golden ratio overlay, pro consultation tools
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { Upload, Brain, Ruler, Eye, Download, RotateCcw, Camera, Share2, Sparkles, Home, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShapeSelector } from "@/components/beauty-sim/shared/shape-selector";
import { AdjustmentSliders } from "@/components/beauty-sim/shared/adjustment-sliders";
import { ColorPalette, BROW_COLORS, LIP_COLORS } from "@/components/beauty-sim/shared/color-palette";
import { BeforeAfterSlider } from "@/components/beauty-sim/shared/before-after-slider";
import { GoldenRuler } from "./golden-ruler";
import { Slider } from "@/components/ui/slider";
import type { AdjustmentParams, BrowSideParams, LandmarkData } from "@/lib/eyebrow-renderer";
import { ALL_TEMPLATES } from "@/lib/eyebrow-templates";
import type { EyebrowTemplate } from "@/lib/eyebrow-templates";
import type { LipParams } from "@/lib/lip-renderer";
import type { GoldenRatioResult, GoldenRatioComparison } from "@/lib/golden-ratio";

// ─── Types & Defaults ───────────────────────────────────────────────────────

type ProStep = "upload" | "analyzing" | "consultation";
type BrowSide = "left" | "right" | "both";
type ViewMode = "preview" | "compare" | "ruler";

const DEFAULT_ADJ: AdjustmentParams = { scaleX: 1.0, scaleY: 1.0, angleOffset: 0, opacity: 0.5, offsetX: 0, offsetY: 0 };
const DEFAULT_LIP: LipParams = { color: "#c45c6a", saturation: 55 };

function getActiveAdj(side: BrowSide, left: AdjustmentParams, right: AdjustmentParams): AdjustmentParams {
    if (side === "right") return right;
    return left;
}

// ─── Upload Step (Pro) ──────────────────────────────────────────────────────

function ProUploadStep({ inputRef, onFile }: Readonly<{
    inputRef: React.RefObject<HTMLInputElement | null>;
    onFile: (f: File) => void;
}>): React.ReactElement {
    return (
        <div className="flex flex-col gap-4">
            <div className="text-center">
                <p className="text-sm font-semibold">고객 사진 업로드</p>
                <p className="text-xs text-muted-foreground">AI가 얼굴을 분석하고 황금비율 측정 + 시뮬레이션을 제공합니다</p>
            </div>
            <button
                type="button"
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-input px-6 py-12 transition-colors hover:border-violet-400 hover:bg-violet-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-violet-400 dark:hover:bg-violet-950/20"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
            >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">고객의 정면 얼굴 사진을 올려주세요</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WebP (카메라 촬영 가능)</p>
            </button>
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 dark:border-violet-900 dark:bg-violet-950/30">
                <p className="text-xs font-medium text-violet-800 dark:text-violet-200">원장님 전용 상담 도구</p>
                <p className="mt-1 text-xs text-violet-600 dark:text-violet-400">
                    황금비율 스마트 룰러 + 눈썹/입술 실시간 시뮬레이션 + 비포/애프터 비교.
                    고객 앞에서 즉시 시뮬레이션하여 상담 전환율을 높이세요.
                </p>
            </div>
        </div>
    );
}

// ─── Eyebrow Tab (Pro) ──────────────────────────────────────────────────────

function ProEyebrowTab({ selectedId, onSelectTemplate, activeAdj, browSide, onAdjChange, onSideChange, browColor, onColorChange }: Readonly<{
    selectedId: string | null;
    onSelectTemplate: (t: EyebrowTemplate) => void;
    activeAdj: AdjustmentParams;
    browSide: BrowSide;
    onAdjChange: (p: AdjustmentParams) => void;
    onSideChange: (s: BrowSide) => void;
    browColor: string;
    onColorChange: (hex: string) => void;
}>): React.ReactElement {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">모양</p>
                <ShapeSelector selectedId={selectedId} onSelect={onSelectTemplate} />
            </div>
            <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">정밀 조절 (좌/우 개별)</p>
                <AdjustmentSliders params={activeAdj} side={browSide} onParamsChange={onAdjChange} onSideChange={onSideChange} />
            </div>
            <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">컬러 (17색)</p>
                <ColorPalette colors={BROW_COLORS} selected={browColor} onSelect={onColorChange} />
            </div>
        </div>
    );
}

// ─── Lip Tab (Pro) ──────────────────────────────────────────────────────────

function ProLipTab({ lipEnabled, onToggleLip, lipParams, onLipParamsChange }: Readonly<{
    lipEnabled: boolean;
    onToggleLip: () => void;
    lipParams: LipParams;
    onLipParamsChange: (p: LipParams) => void;
}>): React.ReactElement {
    return (
        <div className="flex flex-col gap-4">
            <button
                type="button"
                aria-pressed={lipEnabled}
                className={`self-start rounded-full px-4 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    lipEnabled ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80 focus-visible:bg-muted/80"
                }`}
                onClick={onToggleLip}
            >
                {lipEnabled ? "입술 ON" : "입술 OFF"}
            </button>

            {lipEnabled ? (
                <>
                    <div>
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">컬러 (20색)</p>
                        <ColorPalette
                            colors={LIP_COLORS}
                            selected={lipParams.color}
                            onSelect={(hex) => onLipParamsChange({ ...lipParams, color: hex })}
                        />
                    </div>
                    <div>
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">채도</p>
                        <div className="flex items-center gap-3">
                            <span className="w-10 shrink-0 text-xs text-muted-foreground">연하게</span>
                            <Slider
                                min={0} max={100} step={1}
                                value={[lipParams.saturation]}
                                onValueChange={(v) => {
                                    const val = v[0];
                                    if (val !== undefined) onLipParamsChange({ ...lipParams, saturation: val });
                                }}
                                aria-label="입술 채도 조절"
                                className="flex-1"
                            />
                            <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">진하게</span>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}

// ─── Header Bar ────────────────────────────────────────────────────────────

function ProHeader({ viewMode, onChangeMode, showViewToggle }: Readonly<{
    viewMode: ViewMode;
    onChangeMode: (mode: ViewMode) => void;
    showViewToggle: boolean;
}>): React.ReactElement {
    const modes: Array<{ value: ViewMode; label: string; icon: React.ReactNode }> = [
        { value: "preview", label: "미리보기", icon: <Eye className="h-3 w-3" /> },
        { value: "compare", label: "비교", icon: <Share2 className="h-3 w-3" /> },
        { value: "ruler", label: "황금비율", icon: <Ruler className="h-3 w-3" /> },
    ];

    return (
        <div className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-6">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    <span className="text-sm font-semibold">원장님 상담 도구</span>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900 dark:text-violet-300">PRO</span>
                </div>
                {showViewToggle ? (
                    <div className="flex gap-1 border-l pl-4">
                        {modes.map((m) => (
                            <button
                                key={m.value}
                                type="button"
                                aria-pressed={viewMode === m.value}
                                className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                    viewMode === m.value
                                        ? "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
                                        : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"
                                }`}
                                onClick={() => onChangeMode(m.value)}
                            >
                                {m.icon}{m.label}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>
            <div className="flex items-center gap-1">
                <Link
                    href="/"
                    className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="홈으로"
                >
                    <Home className="h-4 w-4" />
                </Link>
                <Link
                    href="/"
                    className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="닫기"
                >
                    <X className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}

// ─── Consultation Panel ─────────────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function -- Pro consultation panel with canvas, tabs, ruler, sliders
function ConsultationPanel({ imageDataUrl, image, landmarks, goldenRatio, viewMode, onReset }: Readonly<{
    imageDataUrl: string;
    image: HTMLImageElement;
    landmarks: LandmarkData;
    goldenRatio: GoldenRatioResult;
    viewMode: ViewMode;
    onReset: () => void;
}>): React.ReactElement {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

    // Eyebrow state
    const [selectedTemplate, setSelectedTemplate] = useState<EyebrowTemplate | null>(null);
    const [browColor, setBrowColor] = useState("#3a2a1a");
    const [browSide, setBrowSide] = useState<BrowSide>("both");
    const [leftAdj, setLeftAdj] = useState<AdjustmentParams>({ ...DEFAULT_ADJ });
    const [rightAdj, setRightAdj] = useState<AdjustmentParams>({ ...DEFAULT_ADJ });

    // Lip state
    const [lipParams, setLipParams] = useState<LipParams>({ ...DEFAULT_LIP });
    const [lipEnabled, setLipEnabled] = useState(false);

    // View
    const [resultDataUrl, setResultDataUrl] = useState<string | null>(null);

    // Golden ratio comparison
    const [ratioComparison, setRatioComparison] = useState<GoldenRatioComparison | null>(null);

    const activeAdj = getActiveAdj(browSide, leftAdj, rightAdj);

    // Auto-select first template
    useEffect(() => {
        if (selectedTemplate) return;
        const first = ALL_TEMPLATES[0];
        if (first) setSelectedTemplate(first);
    }, [selectedTemplate]);

    // Recompute golden ratio when brow adjustments change
    useEffect(() => {
        const hasAdjustment = leftAdj.offsetX !== 0 || leftAdj.offsetY !== 0 || leftAdj.scaleY !== 1.0
            || rightAdj.offsetX !== 0 || rightAdj.offsetY !== 0 || rightAdj.scaleY !== 1.0;

        if (!hasAdjustment) {
            setRatioComparison(null);
            return;
        }

        void import("@/lib/golden-ratio").then(({ computeGoldenRatioWithAdjustment }) => {
            const comparison = computeGoldenRatioWithAdjustment(
                landmarks.points,
                canvasSize.w || image.naturalWidth,
                canvasSize.h || image.naturalHeight,
                { left: leftAdj, right: rightAdj },
            );
            setRatioComparison(comparison);
        });
    }, [leftAdj, rightAdj, landmarks.points, canvasSize.w, canvasSize.h, image.naturalWidth, image.naturalHeight]);

    // Canvas rendering
    const renderCanvas = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas || !selectedTemplate) return;

        const { renderEyebrowsToCanvas, prepareCanvas } = await import("@/lib/eyebrow-renderer");
        if (canvas.width === 0) prepareCanvas(canvas, image);

        setCanvasSize({ w: canvas.width, h: canvas.height });

        const sideParams: BrowSideParams = { left: leftAdj, right: rightAdj };
        await renderEyebrowsToCanvas(canvas, image, landmarks, selectedTemplate, browColor, sideParams);

        if (lipEnabled) {
            const { renderLipsToCanvas } = await import("@/lib/lip-renderer");
            renderLipsToCanvas(canvas, landmarks, lipParams);
        }

        setResultDataUrl(canvas.toDataURL("image/png"));
    }, [selectedTemplate, browColor, leftAdj, rightAdj, lipEnabled, lipParams, image, landmarks]);

    useEffect(() => {
        const raf = requestAnimationFrame(() => { void renderCanvas(); });
        return () => cancelAnimationFrame(raf);
    }, [renderCanvas]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        void import("@/lib/eyebrow-renderer").then(({ prepareCanvas }) => {
            prepareCanvas(canvas, image);
            setCanvasSize({ w: canvas.width, h: canvas.height });
        });
    }, [image]);

    // Handlers
    const handleAdjChange = useCallback((newAdj: AdjustmentParams) => {
        if (browSide === "both") { setLeftAdj(newAdj); setRightAdj(newAdj); }
        else if (browSide === "left") { setLeftAdj(newAdj); }
        else { setRightAdj(newAdj); }
    }, [browSide]);

    const handleReset = useCallback(() => {
        setLeftAdj({ ...DEFAULT_ADJ });
        setRightAdj({ ...DEFAULT_ADJ });
        setBrowColor("#3a2a1a");
        setLipParams({ ...DEFAULT_LIP });
        setLipEnabled(false);
        setBrowSide("both");
    }, []);

    const handleSave = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `consultation-${Date.now()}.png`;
        a.click();
    }, []);

    // Preview area
    const showCompare = viewMode === "compare" && resultDataUrl;
    const previewContent = (
        <div className="relative h-full shrink-0">
            <canvas ref={canvasRef} className={`block h-full w-auto ${showCompare ? "hidden" : ""}`} />
            {viewMode === "ruler" ? (
                <GoldenRuler
                    result={goldenRatio}
                    comparison={ratioComparison ?? undefined}
                    canvasWidth={canvasSize.w}
                    canvasHeight={canvasSize.h}
                    showOverlay
                />
            ) : null}
            {showCompare ? (
                <BeforeAfterSlider beforeSrc={imageDataUrl} afterSrc={resultDataUrl} />
            ) : null}
        </div>
    );

    return (
        <div className="flex h-full gap-4 p-4">
            {/* 왼쪽: 사진 (높이 100%, 너비는 비율 자동) */}
            {previewContent}

            {/* 오른쪽: 남은 공간 전부 (스크롤 가능) */}
            <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
                {/* Golden Ratio Panel */}
                {viewMode === "ruler" ? (
                    <GoldenRuler
                        result={goldenRatio}
                        comparison={ratioComparison ?? undefined}
                        canvasWidth={canvasSize.w}
                        canvasHeight={canvasSize.h}
                        showOverlay={false}
                    />
                ) : null}

                {/* Tabs */}
                <Tabs defaultValue="eyebrow" className="w-full">
                    <TabsList className="w-full">
                        <TabsTrigger value="eyebrow" className="flex-1">눈썹</TabsTrigger>
                        <TabsTrigger value="lip" className="flex-1">입술</TabsTrigger>
                    </TabsList>

                    <TabsContent value="eyebrow" className="pt-2">
                        <ProEyebrowTab
                            selectedId={selectedTemplate?.id ?? null}
                            onSelectTemplate={setSelectedTemplate}
                            activeAdj={activeAdj}
                            browSide={browSide}
                            onAdjChange={handleAdjChange}
                            onSideChange={setBrowSide}
                            browColor={browColor}
                            onColorChange={setBrowColor}
                        />
                    </TabsContent>

                    <TabsContent value="lip" className="pt-2">
                        <ProLipTab
                            lipEnabled={lipEnabled}
                            onToggleLip={() => setLipEnabled((prev) => !prev)}
                            lipParams={lipParams}
                            onLipParamsChange={setLipParams}
                        />
                    </TabsContent>
                </Tabs>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 gap-1.5" onClick={handleSave} aria-label="결과 저장">
                        <Download className="h-4 w-4" />저장
                    </Button>
                    <Button variant="outline" className="flex-1 gap-1.5" onClick={handleReset} aria-label="초기화">
                        <RotateCcw className="h-4 w-4" />초기화
                    </Button>
                    <Button variant="outline" className="flex-1 gap-1.5" onClick={onReset} aria-label="새 고객 사진">
                        <Camera className="h-4 w-4" />새 고객
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Pro Component ─────────────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function -- Pro client with upload + face analysis + golden ratio + consultation
export function ProBeautySimClient(): React.ReactElement {
    const [step, setStep] = useState<ProStep>("upload");
    const [viewMode, setViewMode] = useState<ViewMode>("preview");
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [landmarks, setLandmarks] = useState<LandmarkData | null>(null);
    const [goldenRatio, setGoldenRatio] = useState<GoldenRatioResult | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const onFile = useCallback(async (file: File) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result as string;
            setImageDataUrl(dataUrl);
            setStep("analyzing");
            setError(null);

            try {
                const { initFaceAnalysis, analyzeFace, loadImage } = await import("@/lib/face-analysis");
                await initFaceAnalysis();
                const img = await loadImage(dataUrl);
                imageRef.current = img;
                const result = analyzeFace(img);

                if (!result) {
                    setError("얼굴을 감지하지 못했습니다. 고객의 정면 사진을 올려주세요.");
                    setStep("upload");
                    setImageDataUrl(null);
                    return;
                }

                setLandmarks(result.landmarks);

                // Compute golden ratio
                const { computeGoldenRatio } = await import("@/lib/golden-ratio");
                const gr = computeGoldenRatio(result.landmarks.points, img.naturalWidth, img.naturalHeight);
                setGoldenRatio(gr);

                setStep("consultation");
            } catch {
                setError("얼굴 분석 중 오류가 발생했습니다.");
                setStep("upload");
                setImageDataUrl(null);
            }
        };
        reader.readAsDataURL(file);
    }, []);

    const onReset = useCallback(() => {
        setStep("upload");
        setImageDataUrl(null);
        setError(null);
        setLandmarks(null);
        setGoldenRatio(null);
        imageRef.current = null;
    }, []);

    return (
        <>
            <ProHeader viewMode={viewMode} onChangeMode={setViewMode} showViewToggle={step === "consultation"} />
            <div className={`flex-1 overflow-hidden ${step !== "consultation" ? "flex items-center justify-center" : ""}`}>
            {error ? (
                <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center text-sm text-destructive">
                    {error}
                </p>
            ) : null}

            {step === "upload" ? <ProUploadStep inputRef={inputRef} onFile={onFile} /> : null}

            {step === "analyzing" ? (
                <div className="flex flex-col items-center gap-4">
                    <Brain className="h-12 w-12 animate-pulse text-violet-500" />
                    <p className="text-lg font-medium">고객 얼굴을 분석하는 중...</p>
                    <p className="text-sm text-muted-foreground">황금비율 측정 + 얼굴형 분석 + 스타일 추천</p>
                </div>
            ) : null}

            {step === "consultation" && imageDataUrl && imageRef.current && landmarks && goldenRatio ? (
                <ConsultationPanel
                    imageDataUrl={imageDataUrl}
                    image={imageRef.current}
                    landmarks={landmarks}
                    goldenRatio={goldenRatio}
                    viewMode={viewMode}
                    onReset={onReset}
                />
            ) : null}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
            </div>
        </>
    );
}
