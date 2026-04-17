// @client-reason: Canvas rendering, slider interactions, real-time eyebrow/lip preview
"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { Joystick } from "@/components/beauty-sim/shared/joystick";
import type { AdjustmentParams, LandmarkData } from "@/lib/eyebrow-renderer";
import { ALL_TEMPLATES } from "@/lib/eyebrow-templates";
import type { EyebrowTemplate } from "@/lib/eyebrow-templates";
import type { LipParams } from "@/lib/lip-renderer";

import type { MainTab, BrowSubTab, LipSubTab, BrowSide } from "./fitting-room-types";
import { DEFAULT_ADJ, DEFAULT_LIP, computeInitialOffsetY, getActiveAdj } from "./fitting-room-types";
import { FittingHeader } from "./fitting-room-header";
import { PhotoArea } from "./fitting-room-photo";
import { MainTabBar, SubTabBar, BROW_SUB_TABS, LIP_SUB_TABS } from "./fitting-room-tabs";
import { BrowContent, LipContent, BottomActions } from "./fitting-room-panels";
import { useCanvasRendering, useShakeAnimation, useBrowDrag, useJoystickHandlers } from "./fitting-room-hooks";
import { ZoomSlider } from "@/components/beauty-sim/shared/zoom-slider";

// eslint-disable-next-line max-lines-per-function -- Fitting room orchestrator with state management
export function FittingRoom({ imageDataUrl, image, landmarks, vibeName, onBack }: Readonly<{
    imageDataUrl: string;
    image: HTMLImageElement;
    landmarks: LandmarkData;
    vibeName: string;
    onBack: () => void;
}>): React.ReactElement {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Compute initial Y offset based on face size (proportional, works for any image size)
    // useMemo since this depends only on stable props (image dimensions + landmarks)
    const initialOffsetY = useMemo(() => {
        const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
        const cw = Math.round(image.naturalWidth * scale);
        const ch = Math.round(image.naturalHeight * scale);
        return computeInitialOffsetY(landmarks, cw, ch);
    }, [image.naturalWidth, image.naturalHeight, landmarks]);

    // Eyebrow state — leftAdj/rightAdj are PERSON's anatomical perspective (used by renderer)
    const [selectedTemplate, setSelectedTemplate] = useState<EyebrowTemplate | null>(() => ALL_TEMPLATES[0] ?? null);
    const [browColor, setBrowColor] = useState("#4a3020");
    const [browSide, setBrowSide] = useState<BrowSide>("both");
    const [leftAdj, setLeftAdj] = useState<AdjustmentParams>(() => ({ ...DEFAULT_ADJ, offsetY: initialOffsetY }));
    const [rightAdj, setRightAdj] = useState<AdjustmentParams>(() => ({ ...DEFAULT_ADJ, offsetY: initialOffsetY }));
    const [browExcluded, setBrowExcluded] = useState(false);

    // Lip state
    const [lipParams, setLipParams] = useState<LipParams>({ ...DEFAULT_LIP });
    const [lipExcluded, setLipExcluded] = useState(false);
    // Track whether lip tab has ever been visited (enables lip rendering)
    const [lipEverVisited, setLipEverVisited] = useState(false);

    // UI state
    const [mainTab, setMainTab] = useState<MainTab>("brow");
    const [browSubTab, setBrowSubTab] = useState<BrowSubTab>("shape");
    const [lipSubTab, setLipSubTab] = useState<LipSubTab>("color");
    const [isComparing, setIsComparing] = useState(false);
    const [joystickActive, setJoystickActive] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Drag visual state
    const [dragVisible, setDragVisible] = useState(false);
    const [dragPointer, setDragPointer] = useState<{ x: number; y: number } | null>(null);
    const [dragSideState, setDragSideState] = useState<"left" | "right">("left");

    const activeAdj = getActiveAdj(browSide, leftAdj, rightAdj);

    // Derive lipEnabled: true once lip tab visited and not excluded
    const lipEnabled = (lipEverVisited || mainTab === "lip") && !lipExcluded;

    // Track lip tab visit for persistent lip rendering
    const handleMainTabChange = useCallback((t: MainTab) => {
        setJoystickActive(false);
        setMainTab(t);
        if (t === "lip") setLipEverVisited(true);
    }, []);

    // Shake animation
    const startShake = useShakeAnimation(initialOffsetY, setLeftAdj, setRightAdj);

    useCanvasRendering({
        canvasRef, image, landmarks, selectedTemplate, browColor,
        leftAdj, rightAdj, browExcluded, lipEnabled, lipExcluded, lipParams, startShake,
    });

    // Drag handlers
    const { handleDragStart, handleDragMove, handleDragEnd } = useBrowDrag({
        canvasRef, landmarks, leftAdj, rightAdj, setLeftAdj, setRightAdj,
        isComparing, joystickActive, setJoystickActive,
        setDragVisible, setDragPointer, setDragSideState,
    });

    // Joystick handlers
    const { handleJoystickMove, handleJoystickStart, handleJoystickEnd } = useJoystickHandlers(
        canvasRef, containerRef, browSide, setLeftAdj, setRightAdj, setJoystickActive,
    );

    // ─── Handlers ─────────────────────────────────────────────────────────

    const handleAdjChange = useCallback((newAdj: AdjustmentParams) => {
        if (browSide === "both") {
            const shared = { scaleX: newAdj.scaleX, scaleY: newAdj.scaleY, angleOffset: newAdj.angleOffset, opacity: newAdj.opacity };
            setLeftAdj((prev) => ({ ...prev, ...shared }));
            setRightAdj((prev) => ({ ...prev, ...shared }));
        } else if (browSide === "left") {
            setRightAdj(newAdj);
        } else {
            setLeftAdj(newAdj);
        }
    }, [browSide]);

    const handleReset = useCallback(() => {
        setLeftAdj({ ...DEFAULT_ADJ, offsetY: initialOffsetY });
        setRightAdj({ ...DEFAULT_ADJ, offsetY: initialOffsetY });
        setBrowColor("#4a3020");
        setBrowExcluded(false);
        setLipParams({ ...DEFAULT_LIP });
        setLipEverVisited(false);
        setLipExcluded(false);
        setBrowSide("both");
        setBrowSubTab("shape");
        setLipSubTab("color");
        setIsComparing(false);
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
        const first = ALL_TEMPLATES[0];
        if (first) setSelectedTemplate(first);
    }, [initialOffsetY]);

    const handleSave = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `beauty-sim-${Date.now()}.png`;
        a.click();
    }, []);

    return (
        <div className="fixed inset-0 flex flex-col overflow-hidden bg-gray-900">
            <FittingHeader
                vibeName={vibeName}
                onBack={onBack}
                onReset={handleReset}
            />

            <PhotoArea
                canvasRef={canvasRef}
                imageDataUrl={imageDataUrl}
                isComparing={isComparing}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                isDragging={dragVisible}
                dragPointer={dragPointer}
                dragSide={dragSideState}
                containerRef={containerRef}
                zoomed={joystickActive}
                zoomLevel={zoomLevel}
                setZoomLevel={setZoomLevel}
                pan={pan}
                setPan={setPan}
            />

            <div className="mx-auto flex w-full max-w-lg shrink-0 items-center gap-2 px-4 py-1">
                <div className="min-w-0 flex-1">
                    <ZoomSlider zoom={zoomLevel} onZoomChange={setZoomLevel} />
                </div>
                <button
                    type="button"
                    className="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setIsComparing((prev) => !prev)}
                >
                    {isComparing ? "원본" : "비교하기"}
                </button>
            </div>

            <div className="shrink-0 overflow-hidden rounded-t-2xl bg-gray-900/95 backdrop-blur-md">
                <div className="mx-auto max-w-lg overflow-hidden px-4 py-2">
                    <MainTabBar active={mainTab} onChange={handleMainTabChange} />

                    {mainTab === "brow" ? (
                        <>
                            <SubTabBar tabs={BROW_SUB_TABS} active={browSubTab} onChange={(t) => { setJoystickActive(false); setBrowSubTab(t); }} />
                            <div className="flex items-start gap-3 pt-1">
                                <div className="h-28 min-w-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                                    <BrowContent
                                        subTab={browSubTab}
                                        selectedId={selectedTemplate?.id ?? null}
                                        onSelectTemplate={setSelectedTemplate}
                                        activeAdj={activeAdj}
                                        browSide={browSide}
                                        onAdjChange={handleAdjChange}
                                        onSideChange={setBrowSide}
                                        browColor={browColor}
                                        onColorChange={setBrowColor}
                                        browExcluded={browExcluded}
                                        onToggleExclude={() => setBrowExcluded((prev) => !prev)}
                                    />
                                </div>
                                <div className="shrink-0 pt-1">
                                    <Joystick
                                        onMove={handleJoystickMove}
                                        onStart={handleJoystickStart}
                                        onEnd={handleJoystickEnd}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <SubTabBar tabs={LIP_SUB_TABS} active={lipSubTab} onChange={(t) => { setJoystickActive(false); setLipSubTab(t); }} />
                            <div className="h-28 overflow-y-auto pt-1 [&::-webkit-scrollbar]:hidden">
                                <LipContent
                                    subTab={lipSubTab}
                                    lipParams={lipParams}
                                    onLipParamsChange={setLipParams}
                                    lipExcluded={lipExcluded}
                                    onToggleExclude={() => setLipExcluded((prev) => !prev)}
                                />
                            </div>
                        </>
                    )}

                    <BottomActions onSave={handleSave} />
                </div>
            </div>
        </div>
    );
}
