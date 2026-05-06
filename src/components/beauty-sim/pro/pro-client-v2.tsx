// @client-reason: Canvas rendering, slider interactions, golden ratio overlay, pro consultation tools + brow erase experiment
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { Upload, Brain, Ruler, Eye, Download, RotateCcw, Camera, Share2, Sparkles, Home, X, Eraser, Paintbrush } from "lucide-react";
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
const TOGGLE_OFF_CLASS = "bg-muted text-muted-foreground hover:bg-muted/80 focus-visible:bg-muted/80";
const DEFAULT_LIP: LipParams = { color: "#c45c6a", saturation: 55 };

function getActiveAdj(side: BrowSide, left: AdjustmentParams, right: AdjustmentParams): AdjustmentParams {
    if (side === "right") return right;
    return left;
}

// ─── Upload Step ────────────────────────────────────────────────────────────

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
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/30">
                <p className="text-xs font-medium text-rose-800 dark:text-rose-200">V2 실험 — 자연눈썹 블러 기능</p>
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                    자연 눈썹을 자동 감지하여 가우시안 블러로 지운 후 새 눈썹 템플릿을 오버레이합니다.
                    기존 기능 + 눈썹 지우기 실험 페이지입니다.
                </p>
            </div>
        </div>
    );
}

// ─── Eyebrow Tab (V2 — with erase toggle) ──────────────────────────────────

// eslint-disable-next-line max-lines-per-function -- Eyebrow tab with auto-erase toggle + manual brush controls
function ProEyebrowTabV2({ selectedId, onSelectTemplate, activeAdj, browSide, onAdjChange, onSideChange, browColor, onColorChange, browEraseEnabled, onBrowEraseToggle, brushMode, onBrushModeToggle, brushSize, onBrushSizeChange, onBrushClear }: Readonly<{
    selectedId: string | null;
    onSelectTemplate: (t: EyebrowTemplate) => void;
    activeAdj: AdjustmentParams;
    browSide: BrowSide;
    onAdjChange: (p: AdjustmentParams) => void;
    onSideChange: (s: BrowSide) => void;
    browColor: string;
    onColorChange: (hex: string) => void;
    browEraseEnabled: boolean;
    onBrowEraseToggle: () => void;
    brushMode: boolean;
    onBrushModeToggle: () => void;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    onBrushClear: () => void;
}>): React.ReactElement {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">자연눈썹 처리</p>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        aria-pressed={browEraseEnabled}
                        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            browEraseEnabled
                                ? "bg-rose-500 text-white"
                                : TOGGLE_OFF_CLASS
                        }`}
                        onClick={onBrowEraseToggle}
                    >
                        <Eraser className="h-3 w-3" />
                        {browEraseEnabled ? "자동 지우기 ON" : "자동 지우기 OFF"}
                    </button>
                    <button
                        type="button"
                        aria-pressed={brushMode}
                        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            brushMode
                                ? "bg-rose-500 text-white"
                                : TOGGLE_OFF_CLASS
                        }`}
                        onClick={onBrushModeToggle}
                    >
                        <Paintbrush className="h-3 w-3" />
                        {brushMode ? "컨실러 ON" : "컨실러 OFF"}
                    </button>
                    {brushMode ? (
                        <button
                            type="button"
                            className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted/80"
                            onClick={onBrushClear}
                        >
                            브러시 초기화
                        </button>
                    ) : null}
                </div>
                {browEraseEnabled ? (
                    <p className="mt-1.5 text-[10px] text-rose-500">AI가 감지한 눈썹 영역에 자동 블러를 적용합니다</p>
                ) : null}
                {brushMode ? (
                    <div className="mt-2">
                        <p className="mb-1 text-[10px] text-rose-500">사진 위에 직접 칠해서 남은 눈썹을 지웁니다</p>
                        <div className="flex items-center gap-3">
                            <span className="w-8 shrink-0 text-xs text-muted-foreground">작게</span>
                            <Slider
                                min={5} max={50} step={1}
                                value={[brushSize]}
                                onValueChange={(v) => {
                                    const val = v[0];
                                    if (val !== undefined) onBrushSizeChange(val);
                                }}
                                aria-label="브러시 크기 조절"
                                className="flex-1"
                            />
                            <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">크게</span>
                        </div>
                    </div>
                ) : null}
            </div>
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

// ─── Lip Tab ────────────────────────────────────────────────────────────────

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
                    lipEnabled ? "bg-violet-500 text-white" : TOGGLE_OFF_CLASS
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

// ─── Header Bar ─────────────────────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function -- Header with view mode toggle buttons
function ProHeaderV2({ viewMode, onChangeMode, showViewToggle }: Readonly<{
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
                    <Sparkles className="h-4 w-4 text-rose-500" />
                    <span className="text-sm font-semibold">원장님 상담 도구</span>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900 dark:text-rose-300">V2 실험</span>
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
                                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
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
                    href="/pro/beauty-sim"
                    className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="V1으로 돌아가기"
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

// ─── Consultation Panel (V2) ───────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function, complexity -- Pro V2 consultation panel: canvas, tabs, ruler, sliders, auto-erase + manual brush
function ConsultationPanelV2({ imageDataUrl, image, landmarks, goldenRatio, viewMode, onReset }: Readonly<{
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

    // V2: Brow erase
    const [browEraseEnabled, setBrowEraseEnabled] = useState(false);

    // V2: Manual concealer brush
    const [brushMode, setBrushMode] = useState(false);
    const [brushSize, setBrushSize] = useState(20);
    const brushMaskRef = useRef<HTMLCanvasElement | null>(null);
    const isPaintingRef = useRef(false);
    const [brushVersion, setBrushVersion] = useState(0);

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

    // Canvas rendering (V2: includes brow erase option)
    const renderCanvas = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas || !selectedTemplate) return;

        const { renderEyebrowsToCanvas, prepareCanvas } = await import("@/lib/eyebrow-renderer");
        if (canvas.width === 0) prepareCanvas(canvas, image);

        setCanvasSize({ w: canvas.width, h: canvas.height });

        const sideParams: BrowSideParams = { left: leftAdj, right: rightAdj };
        await renderEyebrowsToCanvas(
            canvas, image, landmarks, selectedTemplate, browColor, sideParams,
            {
                eraseBrows: browEraseEnabled,
                brushMask: brushMaskRef.current ?? undefined,
            },
        );

        if (lipEnabled) {
            const { renderLipsToCanvas } = await import("@/lib/lip-renderer");
            renderLipsToCanvas(canvas, landmarks, lipParams);
        }

        setResultDataUrl(canvas.toDataURL("image/png"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- brushVersion triggers re-render after brush strokes; ref value is current at call time
    }, [selectedTemplate, browColor, leftAdj, rightAdj, lipEnabled, lipParams, image, landmarks, browEraseEnabled, brushVersion]);

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

    // Brush mask canvas — same resolution as main canvas
    useEffect(() => {
        if (canvasSize.w === 0 || canvasSize.h === 0) return;
        if (!brushMaskRef.current) {
            brushMaskRef.current = document.createElement("canvas");
        }
        const mask = brushMaskRef.current;
        if (mask.width !== canvasSize.w || mask.height !== canvasSize.h) {
            mask.width = canvasSize.w;
            mask.height = canvasSize.h;
        }
    }, [canvasSize.w, canvasSize.h]);

    // Pointer handlers for brush painting
    const paintAtCoord = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const mask = brushMaskRef.current;
        if (!canvas || !mask) return;
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width;
        const sy = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * sx;
        const y = (e.clientY - rect.top) * sy;
        const r = brushSize * sx;

        const maskCtx = mask.getContext("2d");
        if (maskCtx) {
            maskCtx.fillStyle = "#fff";
            maskCtx.beginPath();
            maskCtx.arc(x, y, r, 0, Math.PI * 2);
            maskCtx.fill();
        }

        const mainCtx = canvas.getContext("2d");
        if (mainCtx) {
            mainCtx.save();
            mainCtx.globalAlpha = 0.25;
            mainCtx.fillStyle = "rgb(210,185,165)";
            mainCtx.beginPath();
            mainCtx.arc(x, y, r, 0, Math.PI * 2);
            mainCtx.fill();
            mainCtx.restore();
        }
    }, [brushSize]);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!brushMode) return;
        isPaintingRef.current = true;
        paintAtCoord(e);
        e.currentTarget.setPointerCapture(e.pointerId);
    }, [brushMode, paintAtCoord]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!brushMode || !isPaintingRef.current) return;
        paintAtCoord(e);
    }, [brushMode, paintAtCoord]);

    const handlePointerUp = useCallback(() => {
        if (!isPaintingRef.current) return;
        isPaintingRef.current = false;
        setBrushVersion((v) => v + 1);
    }, []);

    const handleBrushClear = useCallback(() => {
        const mask = brushMaskRef.current;
        if (mask) {
            const ctx = mask.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, mask.width, mask.height);
        }
        setBrushVersion((v) => v + 1);
    }, []);

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
        setBrowEraseEnabled(false);
        setBrushMode(false);
        brushMaskRef.current?.getContext("2d")?.clearRect(0, 0, brushMaskRef.current.width, brushMaskRef.current.height);
        setBrushVersion(0);
    }, []);

    const handleSave = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `consultation-v2-${Date.now()}.png`;
        a.click();
    }, []);

    // Preview area
    const showCompare = viewMode === "compare" && resultDataUrl;
    const previewContent = (
        <div className="relative h-full shrink-0">
            <canvas
                ref={canvasRef}
                className={`block h-full w-auto ${showCompare ? "invisible" : ""} ${brushMode ? "cursor-crosshair touch-none" : ""}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            />
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
                <div className="absolute inset-0">
                    <BeforeAfterSlider beforeSrc={imageDataUrl} afterSrc={resultDataUrl} />
                </div>
            ) : null}
        </div>
    );

    return (
        <div className="flex h-full gap-4 p-4">
            {previewContent}

            <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
                {viewMode === "ruler" ? (
                    <GoldenRuler
                        result={goldenRatio}
                        comparison={ratioComparison ?? undefined}
                        canvasWidth={canvasSize.w}
                        canvasHeight={canvasSize.h}
                        showOverlay={false}
                    />
                ) : null}

                <Tabs defaultValue="eyebrow" className="w-full">
                    <TabsList className="w-full">
                        <TabsTrigger value="eyebrow" className="flex-1">눈썹</TabsTrigger>
                        <TabsTrigger value="lip" className="flex-1">입술</TabsTrigger>
                    </TabsList>

                    <TabsContent value="eyebrow" className="pt-2">
                        <ProEyebrowTabV2
                            selectedId={selectedTemplate?.id ?? null}
                            onSelectTemplate={setSelectedTemplate}
                            activeAdj={activeAdj}
                            browSide={browSide}
                            onAdjChange={handleAdjChange}
                            onSideChange={setBrowSide}
                            browColor={browColor}
                            onColorChange={setBrowColor}
                            browEraseEnabled={browEraseEnabled}
                            onBrowEraseToggle={() => setBrowEraseEnabled((prev) => !prev)}
                            brushMode={brushMode}
                            onBrushModeToggle={() => setBrushMode((prev) => !prev)}
                            brushSize={brushSize}
                            onBrushSizeChange={setBrushSize}
                            onBrushClear={handleBrushClear}
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

// ─── Main V2 Component ─────────────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function -- Pro V2 client with upload + face analysis + golden ratio + consultation + brow erase
export function ProBeautySimClientV2(): React.ReactElement {
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
            <ProHeaderV2 viewMode={viewMode} onChangeMode={setViewMode} showViewToggle={step === "consultation"} />
            <div className={`flex-1 overflow-hidden ${step !== "consultation" ? "flex items-center justify-center" : ""}`}>
            {error ? (
                <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center text-sm text-destructive">
                    {error}
                </p>
            ) : null}

            {step === "upload" ? <ProUploadStep inputRef={inputRef} onFile={onFile} /> : null}

            {step === "analyzing" ? (
                <div className="flex flex-col items-center gap-4">
                    <Brain className="h-12 w-12 animate-pulse text-rose-500" />
                    <p className="text-lg font-medium">고객 얼굴을 분석하는 중...</p>
                    <p className="text-sm text-muted-foreground">황금비율 측정 + 얼굴형 분석 + 눈썹 영역 감지</p>
                </div>
            ) : null}

            {step === "consultation" && imageDataUrl && imageRef.current && landmarks && goldenRatio ? (
                <ConsultationPanelV2
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
