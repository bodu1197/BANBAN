"use client";
// @client-reason: Camera/file input, MediaPipe face analysis, canvas mask generation, interactive AI simulation UI

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, Download, X } from "lucide-react";
import {
  initFaceAnalysis,
  analyzeFace,
  generateMask,
  loadImage,
} from "@/lib/face-analysis";
import { optimizeImage } from "@/lib/utils/image-optimizer";
import { useAuth } from "@/hooks/useAuth";

/* eslint-disable @next/next/no-img-element -- base64 data URIs from AI generation */

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = "upload" | "camera" | "analyzing" | "removing" | "simulating" | "done" | "error";
type SimArea = "eyebrow" | "lip";

interface SimResult {
  id: string;
  name: string;
  image: string;
}

export interface RecommendedArtist {
  id: string;
  title: string;
  introduce: string;
  profileImage: string | null;
  regionName: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const EYEBROW_STYLES = [
  { id: "hairstroke", name: "헤어스트록" },
  { id: "combo", name: "콤보" },
  { id: "embo", name: "엠보" },
  { id: "powder", name: "파우더" },
  { id: "natural-arch", name: "내추럴 아치" },
  { id: "straight", name: "일자 눈썹" },
  { id: "soft-arch", name: "소프트 아치" },
  { id: "feathered", name: "페더링" },
] as const;

const LIP_STYLES = [
  { id: "natural-pink", name: "내추럴 핑크" },
  { id: "coral", name: "코랄" },
  { id: "rose", name: "로즈" },
  { id: "mlbb", name: "MLBB" },
  { id: "brick-red", name: "브릭레드" },
] as const;

const PHASE_ESTIMATES: Partial<Record<Phase, string>> = {
  analyzing: "보통 1~3초",
  removing: "보통 5~15초",
  simulating: "보통 20~45초",
};

const AD_CARDS = [
  {
    id: "dolpagu",
    href: "https://dolpagu.com",
    title: "돌파구",
    subtitle: "수수료 0원 재능마켓",
    description: "플랫폼은 다리여야 합니다. 통행료를 걷는 관문이 아니라",
    tags: ["IT", "디자인", "마케팅", "뷰티"],
    gradient: "from-violet-600/20 to-blue-600/20",
    borderColor: "border-violet-500/30",
    accentColor: "text-violet-300",
    tagColor: "bg-violet-500/20 text-violet-200",
  },
  {
    id: "soriplay",
    href: "https://soriplay.com",
    title: "SORI",
    subtitle: "무료 음악 플레이어",
    description: "1억+ 곡, 광고 없이 무료 스트리밍",
    tags: ["음악", "무료", "스트리밍", "플레이리스트"],
    gradient: "from-emerald-600/20 to-teal-600/20",
    borderColor: "border-emerald-500/30",
    accentColor: "text-emerald-300",
    tagColor: "bg-emerald-500/20 text-emerald-200",
  },
] as const;

const AD_ROTATE_MS = 5000;
const ACTIVE_BG = "bg-purple-400";
const PROCESSING_PHASES = new Set<Phase>(["analyzing", "removing", "simulating"]);

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useElapsedTimer(running: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 500);
    return () => clearInterval(interval);
  }, [running]);

  return running ? elapsed : 0;
}

// ─── Image Helpers ─────────────────────────────────────────────────────────

// Top-center crop to match API's sharp({ position: "north" })
function cropToSquare(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(base64); return; }
      ctx.drawImage(img, (img.width - size) / 2, 0, size, size, 0, 0, size, size);
      resolve(canvas.toDataURL("image/png").split(",")[1] ?? base64);
    };
    img.onerror = () => resolve(base64);
    img.src = `data:image/png;base64,${base64}`;
  });
}

// ─── API Helper ─────────────────────────────────────────────────────────────

async function callSimApi(
  image: string,
  mask: string,
  step: "remove" | "simulate",
  style?: string,
): Promise<string> {
  const res = await fetch("/api/ai/beauty-sim-v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, mask, step, style }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "처리에 실패했습니다" }));
    throw new Error((err as { error: string }).error);
  }
  return ((await res.json()) as { image: string }).image;
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

async function runSimulationPipeline(
  base64: string,
  area: SimArea,
  onProgress: (phase: Phase, text: string) => void,
  onStyleComplete?: (completed: number, total: number) => void,
): Promise<{ croppedOriginal: string; cleanedBase64: string; results: SimResult[] }> {
  onProgress("analyzing", "얼굴을 분석하고 있습니다");

  const cropped = await cropToSquare(base64);
  const img = await loadImage(`data:image/png;base64,${cropped}`);
  await initFaceAnalysis();
  const faceResult = analyzeFace(img);
  if (!faceResult) throw new Error("얼굴을 감지하지 못했습니다. 정면 사진으로 다시 시도해주세요.");

  const maskArea = area === "lip" ? "lip" as const : "eyebrow" as const;
  const mask = generateMask(faceResult.landmarks, maskArea, img.width, img.height);

  onProgress(
    "removing",
    area === "eyebrow" ? "눈썹을 제거하고 있습니다" : "입술을 분석하고 있습니다",
  );
  const cleaned = await callSimApi(cropped, mask, "remove");

  onProgress("simulating", "스타일을 생성하고 있습니다");
  const styles = area === "eyebrow" ? EYEBROW_STYLES : LIP_STYLES;
  onStyleComplete?.(0, styles.length);

  let completedCount = 0;
  const settled = await Promise.allSettled(
    styles.map(async (s): Promise<SimResult> => {
      const image = await callSimApi(cleaned, mask, "simulate", s.id);
      completedCount += 1;
      onStyleComplete?.(completedCount, styles.length);
      return { id: s.id, name: s.name, image };
    }),
  );

  const results: SimResult[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") results.push(r.value);
  }
  if (results.length === 0) throw new Error("시뮬레이션 생성에 실패했습니다.");

  return { croppedOriginal: cropped, cleanedBase64: cleaned, results };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StepDot(props: Readonly<{ active: boolean; done: boolean; label: string }>): React.ReactElement {
  let bg = "bg-white/20";
  if (props.done) bg = "bg-green-400";
  else if (props.active) bg = ACTIVE_BG;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`h-3 w-3 rounded-full ${bg} transition-colors`} />
      <span className={`text-xs ${props.active ? "text-white" : "text-gray-500"}`}>{props.label}</span>
    </div>
  );
}

function CameraCapture(props: Readonly<{
  onCapture: (base64: string) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}>): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1024 }, height: { ideal: 1024 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        if (!cancelled) props.onError("카메라 접근이 거부되었습니다. 설정에서 카메라 권한을 허용해주세요.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- props.onError is stable callback, run only on mount
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/png").split(",")[1] ?? "";
    streamRef.current?.getTracks().forEach((t) => t.stop());
    props.onCapture(base64);
  }, [props]);

  return (
    <div className="flex flex-col items-center gap-4">
      <video ref={videoRef} autoPlay playsInline muted className="max-h-[70vh] w-full rounded-2xl" aria-label="카메라 미리보기" />
      <div className="flex gap-3">
        <button
          type="button" onClick={handleCapture}
          className="rounded-xl bg-purple-500 px-8 py-3 text-sm font-medium text-white hover:bg-purple-400 focus-visible:bg-purple-400"
          aria-label="사진 촬영"
        >촬영</button>
        <button
          type="button" onClick={props.onCancel}
          className="rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-white/20 focus-visible:bg-white/20"
          aria-label="촬영 취소"
        >취소</button>
      </div>
    </div>
  );
}

function UploadSection(props: Readonly<{
  area: SimArea;
  onAreaChange: (a: SimArea) => void;
  onFile: (f: File) => void;
  onCamera: () => void;
}>): React.ReactElement {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="mb-6 flex justify-center gap-2" role="radiogroup" aria-label="시뮬레이션 영역 선택">
        {(["eyebrow", "lip"] as const).map((a) => (
          <button
            key={a} type="button"
            role="radio"
            aria-checked={props.area === a}
            onClick={() => props.onAreaChange(a)}
            className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
              props.area === a
                ? "bg-purple-500 text-white"
                : "bg-white/10 text-gray-300 hover:bg-white/20 focus-visible:bg-white/20"
            }`}
          >{a === "eyebrow" ? "눈썹" : "입술"}</button>
        ))}
      </div>
      <div
        className="flex flex-col items-center gap-6 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 p-8 backdrop-blur-sm hover:border-purple-400/40"
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) props.onFile(f); }}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="text-center">
          <p className="mb-2 text-5xl" aria-hidden="true">📷</p>
          <p className="text-lg font-medium text-white">사진을 업로드하세요</p>
          <p className="mt-1 text-sm text-gray-400">정면 사진이 가장 좋은 결과를 줍니다</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl bg-purple-500 px-6 py-3 text-sm font-medium text-white hover:bg-purple-400 focus-visible:bg-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900">사진 선택</button>
          <button type="button" onClick={props.onCamera} className="rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-white/20 focus-visible:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900">셀카 촬영</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) props.onFile(f); }} className="hidden" aria-label="사진 파일 선택" />
      </div>
    </>
  );
}

function ImageZoomModal(props: Readonly<{
  src: string;
  alt: string;
  onClose: () => void;
}>): React.ReactElement {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => { if (e.key === "Escape") props.onClose(); };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onClose is stable
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={props.onClose}
      role="dialog"
      aria-label="이미지 확대 보기"
    >
      <button
        type="button"
        onClick={props.onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus-visible:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
        aria-label="닫기"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={props.src}
        alt={props.alt}
        className="max-h-[90vh] max-w-full rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function downloadBase64Image(base64: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = `data:image/png;base64,${base64}`;
  link.download = fileName;
  link.click();
}

function BeforeAfterSlider(props: Readonly<{
  beforeSrc: string;
  afterSrc: string;
  beforeLabel: string;
  afterLabel: string;
}>): React.ReactElement {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPosition(pct);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging.current) updatePosition(e.clientX);
  }, [updatePosition]);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 5;
    if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - step));
    else if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + step));
    else if (e.key === "Home") setPosition(0);
    else if (e.key === "End") setPosition(100);
    else return;
    e.preventDefault();
  }, []);

  const clipRight = `inset(0 ${100 - position}% 0 0)`;

  return (
    <div
      ref={containerRef}
      className="relative aspect-square w-full cursor-col-resize overflow-hidden rounded-2xl select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="slider"
      aria-label="비포/애프터 비교 슬라이더"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
    >
      <img src={`data:image/png;base64,${props.afterSrc}`} alt={props.afterLabel} className="absolute inset-0 h-full w-full object-cover" />
      <img src={`data:image/png;base64,${props.beforeSrc}`} alt={props.beforeLabel} className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: clipRight }} />
      <div className="absolute inset-y-0 w-0.5 bg-white shadow-lg" style={{ left: `${position}%` }}>
        <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg">
          <span className="text-xs font-bold text-gray-800" aria-hidden="true">↔</span>
        </div>
      </div>
      <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">{props.beforeLabel}</span>
      <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">{props.afterLabel}</span>
    </div>
  );
}

function WaitTimeAds(): React.ReactElement {
  const [adIdx, setAdIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setAdIdx((i) => (i + 1) % AD_CARDS.length);
    }, AD_ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const ad = AD_CARDS[adIdx];

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-[10px] text-gray-500">기다리는 동안 둘러보세요</p>
      <a
        href={ad.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${ad.title} - ${ad.subtitle} (새 탭에서 열림)`}
        className={`block rounded-2xl border ${ad.borderColor} bg-gradient-to-r ${ad.gradient} p-4 backdrop-blur-sm transition-all hover:scale-[1.02] focus-visible:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-lg font-bold ${ad.accentColor}`}>{ad.title}</p>
            <p className="text-sm font-medium text-white">{ad.subtitle}</p>
            <p className="mt-1 text-xs text-gray-400">{ad.description}</p>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ad.tags.map((tag) => (
            <span key={tag} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ad.tagColor}`}>
              {tag}
            </span>
          ))}
        </div>
      </a>
      <div className="mt-2 flex justify-center gap-1.5">
        {AD_CARDS.map((card, i) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setAdIdx(i)}
            aria-label={`${card.title} 광고 보기`}
            className="flex h-8 w-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
          >
            <span
              className={`block h-1.5 w-1.5 rounded-full transition-colors ${
                i === adIdx ? ACTIVE_BG : "bg-white/20"
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function ProcessingView(props: Readonly<{
  phase: Phase;
  originalBase64: string;
  progressText: string;
  elapsedSeconds: number;
  completedStyles: number;
  totalStyles: number;
}>): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-6" aria-busy="true">
      <div className="flex items-center gap-2 text-sm">
        <StepDot active={props.phase === "analyzing"} done={props.phase !== "analyzing"} label="분석" />
        <div className="mb-4 h-px w-8 bg-white/20" />
        <StepDot active={props.phase === "removing"} done={props.phase === "simulating"} label="제거" />
        <div className="mb-4 h-px w-8 bg-white/20" />
        <StepDot active={props.phase === "simulating"} done={false} label="시뮬레이션" />
      </div>

      <div className="flex flex-col items-center gap-1 text-white">
        <div className="flex items-center gap-3" role="status" aria-live="polite">
          <div className="h-5 w-5 motion-safe:animate-spin rounded-full border-2 border-white/30 border-t-purple-400" aria-hidden="true" />
          <span className="text-sm">{props.progressText}</span>
        </div>
        <span className="text-xs text-gray-400" aria-hidden="true">
          {props.elapsedSeconds}초 경과 · {PHASE_ESTIMATES[props.phase] ?? ""}
        </span>
      </div>

      {props.phase === "simulating" && (
        <div className="w-full max-w-xs" role="status" aria-label={`${props.completedStyles}/${props.totalStyles} 스타일 완료`}>
          <div className="mb-1 flex justify-between text-xs text-gray-400">
            <span>스타일 생성 중</span>
            <span>{props.completedStyles}/{props.totalStyles} 완료</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: props.totalStyles }).map((_, i) => (
              <div
                key={`sp-${String(i)}`}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                  i < props.completedStyles ? ACTIVE_BG : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <WaitTimeAds />

      {props.originalBase64 && (
        <img src={`data:image/png;base64,${props.originalBase64}`} alt="원본" className="mx-auto w-48 rounded-2xl opacity-60" />
      )}
    </div>
  );
}

function ResultsView(props: Readonly<{
  area: SimArea;
  originalBase64: string;
  cleanedBase64: string;
  results: SimResult[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  onReset: () => void;
  onZoom: (src: string, alt: string) => void;
  artists: RecommendedArtist[];
}>): React.ReactElement {
  const selected = props.results[props.selectedIdx];
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => props.onZoom(props.originalBase64, "원본")} className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 rounded-xl" aria-label="원본 이미지 확대">
          <p className="mb-1 text-center text-xs font-medium text-gray-400">원본</p>
          <img src={`data:image/png;base64,${props.originalBase64}`} alt="원본" className="w-full rounded-xl transition-transform group-hover:scale-[1.02]" />
        </button>
        <button type="button" onClick={() => props.onZoom(props.cleanedBase64, "제거 결과")} className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 rounded-xl" aria-label="제거 결과 확대">
          <p className="mb-1 text-center text-xs font-medium text-gray-400">{props.area === "eyebrow" ? "눈썹 제거" : "입술 분석"}</p>
          <img src={`data:image/png;base64,${props.cleanedBase64}`} alt="제거 결과" className="w-full rounded-xl transition-transform group-hover:scale-[1.02]" />
        </button>
      </div>

      <div role="radiogroup" aria-label="스타일 선택">
        <p className="mb-3 text-sm font-medium text-white">스타일 선택</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {props.results.map((r, i) => (
            <button
              key={r.id} type="button"
              role="radio" aria-checked={props.selectedIdx === i}
              onClick={() => props.onSelect(i)}
              className={`shrink-0 overflow-hidden rounded-lg transition-all ${
                props.selectedIdx === i
                  ? "ring-2 ring-purple-400 ring-offset-2 ring-offset-gray-900"
                  : "opacity-70 hover:opacity-100 focus-visible:opacity-100"
              }`}
              aria-label={`${r.name} 스타일`}
            >
              <img src={`data:image/png;base64,${r.image}`} alt={r.name} className="h-20 w-20 object-cover" />
              <p className="bg-black/50 px-1 py-0.5 text-center text-[10px] text-white">{r.name}</p>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-white">{selected.name}</p>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-300">AI 생성</span>
                <button
                  type="button"
                  onClick={() => downloadBase64Image(selected.image, `beauty-sim-${selected.id}.png`)}
                  className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20 focus-visible:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
                  aria-label="결과 이미지 저장"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button type="button" onClick={() => props.onZoom(selected.image, selected.name)} className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 rounded-2xl" aria-label={`${selected.name} 결과 확대`}>
              <img src={`data:image/png;base64,${selected.image}`} alt={`${selected.name} 결과`} className="w-full rounded-2xl transition-transform hover:scale-[1.01]" />
            </button>
          </div>

          <div>
            <p className="mb-2 text-center text-xs font-medium text-purple-300">Before / After 비교 (드래그)</p>
            <BeforeAfterSlider
              beforeSrc={props.originalBase64}
              afterSrc={selected.image}
              beforeLabel="Before"
              afterLabel="After"
            />
          </div>
        </>
      )}

      <div className="flex justify-center gap-3">
        <button type="button" onClick={props.onReset} className="rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-white/20 focus-visible:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300">다시 하기</button>
        {selected && (
          <button
            type="button"
            onClick={() => downloadBase64Image(selected.image, `beauty-sim-${selected.id}.png`)}
            className="flex items-center gap-2 rounded-xl bg-purple-500 px-6 py-3 text-sm font-medium text-white hover:bg-purple-400 focus-visible:bg-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
          >
            <Download className="h-4 w-4" />
            결과 저장
          </button>
        )}
      </div>

      {props.artists.length > 0 && (
        <section className="mt-4">
          <p className="mb-3 text-sm font-medium text-white">추천 반영구 아티스트</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {props.artists.map((a) => (
              <Link
                key={a.id}
                href={`/artists/${a.id}`}
                className="group w-40 shrink-0 rounded-xl bg-white/5 p-3 transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
              >
                {a.profileImage ? (
                  <img src={a.profileImage} alt={a.title} className="mb-2 aspect-square w-full rounded-lg object-cover" />
                ) : (
                  <div className="mb-2 flex aspect-square w-full items-center justify-center rounded-lg bg-white/10 text-2xl text-gray-500" aria-hidden="true">👤</div>
                )}
                <p className="truncate text-sm font-medium text-white group-hover:text-purple-300">{a.title}</p>
                {a.introduce && <p className="truncate text-xs text-gray-400">{a.introduce}</p>}
                {a.regionName && <p className="mt-1 text-[10px] text-purple-400">{a.regionName}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function LoginPrompt(props: Readonly<{ onClose: () => void }>): React.ReactElement {
  return (
    <div className="mb-6 flex flex-col items-center gap-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-6 text-center" role="alert">
      <p className="text-sm text-white">로그인 후 AI 시뮬레이션을 이용할 수 있습니다</p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded-xl bg-purple-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-400 focus-visible:bg-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300">로그인</Link>
        <button type="button" onClick={props.onClose} className="rounded-xl bg-white/10 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/20 focus-visible:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300">닫기</button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AiBeautyClient(props: Readonly<{
  artists: RecommendedArtist[];
}>): React.ReactElement {
  const { user, isLoading: authLoading } = useAuth();
  const [phase, setPhase] = useState<Phase>("upload");
  const [area, setArea] = useState<SimArea>("eyebrow");
  const [originalBase64, setOriginalBase64] = useState("");
  const [cleanedBase64, setCleanedBase64] = useState("");
  const [results, setResults] = useState<SimResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [progressText, setProgressText] = useState("");
  const [completedStyles, setCompletedStyles] = useState(0);
  const [totalStyles, setTotalStyles] = useState(8);
  const [zoomImage, setZoomImage] = useState<{ src: string; alt: string } | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const isProcessing = PROCESSING_PHASES.has(phase);
  const elapsedSeconds = useElapsedTimer(isProcessing);

  const requireAuth = useCallback((): boolean => {
    if (authLoading) return false;
    if (!user) { setShowLoginPrompt(true); return false; }
    return true;
  }, [user, authLoading]);

  const startProcessing = useCallback(async (base64: string, simArea: SimArea) => {
    setOriginalBase64(base64);
    setCompletedStyles(0);
    setTotalStyles(simArea === "eyebrow" ? EYEBROW_STYLES.length : LIP_STYLES.length);
    try {
      const output = await runSimulationPipeline(
        base64,
        simArea,
        (p, text) => { setPhase(p); setProgressText(text); },
        (completed) => { setCompletedStyles(completed); },
      );
      setOriginalBase64(output.croppedOriginal);
      setCleanedBase64(output.cleanedBase64);
      setResults(output.results);
      setSelectedIdx(0);
      setPhase("done");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "처리 중 오류가 발생했습니다.");
      setPhase("error");
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (!requireAuth()) return;
    const optimized = await optimizeImage(file, { maxWidth: 2048, quality: 0.9 });
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      const base64 = result.split(",")[1] ?? "";
      startProcessing(base64, area);
    };
    reader.readAsDataURL(optimized);
  }, [startProcessing, area, requireAuth]);

  const handleCapture = useCallback((base64: string) => {
    if (!requireAuth()) return;
    setPhase("analyzing");
    startProcessing(base64, area);
  }, [startProcessing, area, requireAuth]);

  const handleCameraError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setPhase("error");
  }, []);

  const reset = useCallback(() => {
    setPhase("upload");
    setOriginalBase64("");
    setCleanedBase64("");
    setResults([]);
    setSelectedIdx(0);
    setErrorMsg("");
    setProgressText("");
    setCompletedStyles(0);
  }, []);

  const handleZoom = useCallback((src: string, alt: string) => {
    setZoomImage({ src: `data:image/png;base64,${src}`, alt });
  }, []);

  const handleCameraOpen = useCallback(() => {
    if (requireAuth()) setPhase("camera");
  }, [requireAuth]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white md:text-3xl">AI 뷰티 시뮬레이션</h1>
        <p className="mt-2 text-sm text-gray-300">GPT AI가 눈썹/입술을 자연스럽게 제거하고 새로운 스타일을 시뮬레이션합니다</p>
      </header>

      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}

      {phase === "upload" && (
        <UploadSection area={area} onAreaChange={setArea} onFile={handleFile} onCamera={handleCameraOpen} />
      )}

      {phase === "camera" && (
        <CameraCapture onCapture={handleCapture} onCancel={() => setPhase("upload")} onError={handleCameraError} />
      )}

      {isProcessing && (
        <ProcessingView phase={phase} originalBase64={originalBase64} progressText={progressText} elapsedSeconds={elapsedSeconds} completedStyles={completedStyles} totalStyles={totalStyles} />
      )}

      {phase === "done" && (
        <ResultsView
          area={area} originalBase64={originalBase64} cleanedBase64={cleanedBase64}
          results={results} selectedIdx={selectedIdx} onSelect={setSelectedIdx} onReset={reset}
          onZoom={handleZoom} artists={props.artists}
        />
      )}

      {phase === "error" && (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-red-500/10 p-8 text-center" role="alert">
          <p className="text-sm text-red-300">{errorMsg}</p>
          <button type="button" onClick={reset} className="rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-white/20 focus-visible:bg-white/20">다시 시도</button>
        </div>
      )}

      {zoomImage && (
        <ImageZoomModal src={zoomImage.src} alt={zoomImage.alt} onClose={() => setZoomImage(null)} />
      )}
    </div>
  );
}
