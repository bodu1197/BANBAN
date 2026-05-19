"use client";
// @client-reason: Camera/file input, MediaPipe face analysis, canvas mask generation, interactive AI simulation UI

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { Camera, ImageIcon, Download, X, ExternalLink, Sun, Focus, SmilePlus } from "lucide-react";
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

const AD_CARDS = [
  {
    id: "dolpagu",
    href: "https://dolpagu.com",
    title: "돌파구",
    subtitle: "수수료 0원 재능마켓",
    description: "플랫폼은 다리여야 합니다. 통행료를 걷는 관문이 아니라",
    tags: ["IT", "디자인", "마케팅", "뷰티"],
  },
  {
    id: "soriplay",
    href: "https://soriplay.com",
    title: "SORI",
    subtitle: "무료 음악 플레이어",
    description: "1억+ 곡, 광고 없이 무료 스트리밍",
    tags: ["음악", "무료", "스트리밍", "플레이리스트"],
  },
] as const;

const AD_ROTATE_MS = 5000;
const PROCESSING_PHASES = new Set<Phase>(["analyzing", "removing", "simulating"]);

const PHASE_LABELS: Partial<Record<Phase, string>> = {
  analyzing: "얼굴 분석 중",
  removing: "피부 보정 중",
  simulating: "스타일 생성 중",
};

const SAMPLE_IMAGES = Array.from({ length: 8 }, (_, i) => `/images/beauty-sim/samples/${i + 1}.png`);

const GUIDE_TIPS = [
  { icon: Focus, label: "정면을 바라보세요" },
  { icon: Sun, label: "밝은 곳에서 촬영" },
  { icon: SmilePlus, label: "자연스러운 표정" },
] as const;

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
  onProgress("analyzing", "얼굴 윤곽을 정밀 스캔하고 있습니다");

  const cropped = await cropToSquare(base64);
  const img = await loadImage(`data:image/png;base64,${cropped}`);
  await initFaceAnalysis();
  const faceResult = analyzeFace(img);
  if (!faceResult) throw new Error("얼굴을 감지하지 못했습니다. 정면 사진으로 다시 시도해주세요.");

  const maskArea = area === "lip" ? "lip" as const : "eyebrow" as const;
  const mask = generateMask(faceResult.landmarks, maskArea, img.width, img.height);

  onProgress(
    "removing",
    area === "eyebrow" ? "피부 톤을 보정하고 있습니다" : "입술 컬러를 분석하고 있습니다",
  );
  const cleaned = await callSimApi(cropped, mask, "remove");

  onProgress("simulating", "맞춤 스타일을 시뮬레이션하고 있습니다");
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

// ─── Utility ───────────────────────────────────────────────────────────────

function downloadBase64Image(base64: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = `data:image/png;base64,${base64}`;
  link.download = fileName;
  link.click();
}

function getProgressPercent(phase: Phase, completed: number, total: number): number {
  if (phase === "analyzing") return 15;
  if (phase === "removing") return 35;
  if (phase === "simulating") return 50 + Math.round((completed / Math.max(total, 1)) * 50);
  return 0;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function CircularProgress(props: Readonly<{ percent: number }>): React.ReactElement {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (props.percent / 100) * circumference;

  return (
    <div className="relative flex h-36 w-36 items-center justify-center md:h-44 md:w-44">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#dbeafe" strokeWidth="8" />
        <circle
          cx="70" cy="70" r={radius} fill="none" stroke="#3b82f6" strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="motion-safe:transition-all motion-safe:duration-700"
        />
      </svg>
      <span className="text-2xl font-bold text-blue-600 md:text-3xl">{props.percent}%</span>
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
          video: { facingMode: "user" },
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
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-gray-900 p-4">
      <video ref={videoRef} autoPlay playsInline muted className="max-h-[70vh] w-full rounded-xl" aria-label="카메라 미리보기" />
      <div className="flex gap-3">
        <button
          type="button" onClick={handleCapture}
          className="rounded-xl bg-blue-500 px-8 py-3 text-sm font-medium text-white hover:bg-blue-400 focus-visible:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          aria-label="사진 촬영"
        >촬영</button>
        <button
          type="button" onClick={props.onCancel}
          className="rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-white/20 focus-visible:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          aria-label="촬영 취소"
        >취소</button>
      </div>
    </div>
  );
}

function HeroUploadSection(props: Readonly<{
  onFile: (f: File) => void;
  onCamera: () => void;
}>): React.ReactElement {
  const fileRef = useRef<HTMLInputElement>(null);
  const heroIdx = 0;

  return (
    <div className="flex flex-col gap-5">
      <div
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-100 via-blue-50 to-white p-6 pb-0 md:p-8 md:pb-0"
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) props.onFile(f); }}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="flex items-end gap-4">
          <div className="flex-1 pb-6 md:pb-8">
            <p className="text-sm font-semibold text-blue-600 md:text-base">AI 눈썹 · 입술</p>
            <h1 className="mt-1 text-[26px] font-extrabold leading-tight text-gray-900 md:text-3xl">
              시뮬레이션
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-500 md:text-sm">
              내 얼굴에 어울리는 반영구 스타일을<br />미리 체험하세요
            </p>
          </div>
          <div className="relative h-48 w-36 shrink-0 md:h-56 md:w-44">
            <NextImage
              src={SAMPLE_IMAGES[heroIdx]}
              alt="시뮬레이션 예시"
              fill
              className="rounded-t-2xl object-cover object-top"
              sizes="180px"
              priority
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={props.onCamera}
          className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 px-4 py-5 text-white shadow-lg shadow-blue-200 transition-transform hover:scale-[1.02] focus-visible:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          aria-label="셀카 촬영하기"
        >
          <Camera className="h-7 w-7" />
          <span className="text-sm font-bold">지금 촬영하기</span>
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-5 text-gray-700 shadow-sm transition-transform hover:scale-[1.02] focus-visible:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          aria-label="갤러리에서 사진 선택"
        >
          <ImageIcon className="h-7 w-7 text-blue-500" />
          <span className="text-sm font-bold">사진 불러오기</span>
          <span className="text-[11px] text-gray-500">갤러리에서 선택</span>
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) props.onFile(f); }} className="hidden" aria-label="사진 파일 선택" />

      <section className="rounded-2xl bg-white p-4 shadow-sm" aria-label="촬영 가이드">
        <p className="mb-3 text-center text-xs font-semibold text-gray-900">촬영 가이드</p>
        <div className="grid grid-cols-3 gap-3">
          {GUIDE_TIPS.map((tip) => (
            <div key={tip.label} className="flex flex-col items-center gap-1.5 rounded-xl bg-blue-50 p-3">
              <tip.icon className="h-5 w-5 text-blue-500" aria-hidden="true" />
              <span className="text-center text-[11px] font-medium leading-tight text-gray-600">{tip.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="샘플 사진">
        <p className="mb-2 text-center text-xs text-gray-500">이런 사진이 좋은 결과를 만듭니다</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SAMPLE_IMAGES.map((src, i) => (
            <div key={src} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl md:h-20 md:w-20">
              <NextImage
                src={src}
                alt={`샘플 ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </section>

      <p className="mt-1 text-center text-[10px] text-gray-400">* 이 시뮬레이션은 참고용이며 실제 시술 결과와 다를 수 있습니다</p>
    </div>
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
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus-visible:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
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
      className="relative aspect-square w-full cursor-col-resize overflow-hidden rounded-2xl shadow-lg select-none"
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
        className="block rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-blue-50 p-4 transition-all hover:scale-[1.02] focus-visible:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-bold text-blue-600">{ad.title}</p>
            <p className="text-sm font-medium text-gray-800">{ad.subtitle}</p>
            <p className="mt-1 text-xs text-gray-500">{ad.description}</p>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ad.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
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
            className="flex h-8 w-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <span
              className={`block h-1.5 w-1.5 rounded-full transition-colors ${
                i === adIdx ? "bg-blue-500" : "bg-gray-300"
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
  progressText: string;
  elapsedSeconds: number;
  completedStyles: number;
  totalStyles: number;
}>): React.ReactElement {
  const percent = getProgressPercent(props.phase, props.completedStyles, props.totalStyles);
  const phaseLabel = PHASE_LABELS[props.phase] ?? "처리 중";

  return (
    <div className="flex flex-col items-center gap-6 rounded-3xl bg-white p-6 shadow-lg md:p-8" aria-busy="true">
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900 md:text-xl">AI 분석 중</h2>
        <p className="mt-1 text-sm text-gray-500">내 얼굴에 어울리는 스타일을 찾고 있어요</p>
      </div>

      <CircularProgress percent={percent} />

      <div className="flex flex-col items-center gap-1 text-center" role="status" aria-live="polite">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" aria-hidden="true" />
          <span className="text-sm font-medium text-gray-700">{phaseLabel}</span>
        </div>
        <p className="text-xs text-gray-500">{props.progressText}</p>
        <p className="text-xs text-gray-500">{props.elapsedSeconds}초 경과</p>
      </div>

      {props.phase === "simulating" && (
        <div className="w-full max-w-xs" role="status" aria-label={`${props.completedStyles}/${props.totalStyles} 스타일 완료`}>
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>스타일 생성 중</span>
            <span>{props.completedStyles}/{props.totalStyles} 완료</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: props.totalStyles }).map((_, i) => (
              <div
                key={`sp-${String(i)}`}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                  i < props.completedStyles ? "bg-blue-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="w-full rounded-xl bg-blue-50 p-3 text-center">
        <p className="text-xs text-blue-600">
          {props.phase === "simulating" ? "스타일별 시뮬레이션 중 — 보통 20~45초" : "이 과정은 보통 5~15초 소요됩니다"}
        </p>
      </div>

      <WaitTimeAds />
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
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <button type="button" onClick={() => props.onZoom(props.originalBase64, "원본")} className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl" aria-label="원본 이미지 확대">
          <p className="mb-1 text-center text-xs font-medium text-gray-500">원본</p>
          <img src={`data:image/png;base64,${props.originalBase64}`} alt="원본" className="w-full rounded-xl transition-transform group-hover:scale-[1.02]" />
        </button>
        <button type="button" onClick={() => props.onZoom(props.cleanedBase64, "보정 결과")} className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl" aria-label="보정 결과 확대">
          <p className="mb-1 text-center text-xs font-medium text-gray-500">{props.area === "eyebrow" ? "피부 보정" : "입술 분석"}</p>
          <img src={`data:image/png;base64,${props.cleanedBase64}`} alt="보정 결과" className="w-full rounded-xl transition-transform group-hover:scale-[1.02]" />
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm" role="radiogroup" aria-label="스타일 선택">
        <p className="mb-3 text-sm font-bold text-gray-900">스타일 선택</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {props.results.map((r, i) => (
            <button
              key={r.id} type="button"
              role="radio" aria-checked={props.selectedIdx === i}
              onClick={() => props.onSelect(i)}
              className={`shrink-0 overflow-hidden rounded-xl transition-all ${
                props.selectedIdx === i
                  ? "ring-2 ring-blue-500 ring-offset-2"
                  : "opacity-70 hover:opacity-100 focus-visible:opacity-100"
              } focus-visible:outline-none`}
              aria-label={`${r.name} 스타일`}
            >
              <img src={`data:image/png;base64,${r.image}`} alt={r.name} className="h-20 w-20 object-cover" />
              <p className="bg-gray-900/70 px-1 py-0.5 text-center text-[10px] text-white">{r.name}</p>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">{selected.name}</p>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-600">시뮬레이션</span>
              <button
                type="button"
                onClick={() => downloadBase64Image(selected.image, `beauty-sim-${selected.id}.png`)}
                className="rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200 focus-visible:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                aria-label="결과 이미지 저장"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
          <button type="button" onClick={() => props.onZoom(selected.image, selected.name)} className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-2xl" aria-label={`${selected.name} 결과 확대`}>
            <img src={`data:image/png;base64,${selected.image}`} alt={`${selected.name} 결과`} className="w-full rounded-2xl transition-transform hover:scale-[1.01]" />
          </button>
        </div>
      )}

      {selected && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-center text-xs font-semibold text-blue-600">Before / After 비교</p>
          <BeforeAfterSlider
            beforeSrc={props.originalBase64}
            afterSrc={selected.image}
            beforeLabel="Before"
            afterLabel="After"
          />
        </div>
      )}

      <div className="flex justify-center gap-3">
        <button type="button" onClick={props.onReset} className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">다시 하기</button>
        {selected && (
          <button
            type="button"
            onClick={() => downloadBase64Image(selected.image, `beauty-sim-${selected.id}.png`)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-sm font-medium text-white shadow-md shadow-blue-200 hover:from-blue-400 hover:to-blue-500 focus-visible:from-blue-400 focus-visible:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <Download className="h-4 w-4" />
            결과 저장
          </button>
        )}
      </div>

      {props.artists.length > 0 && (
        <section className="mt-2 rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-bold text-gray-900">추천 반영구 아티스트</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {props.artists.map((a) => (
              <Link
                key={a.id}
                href={`/artists/${a.id}`}
                className="group w-36 shrink-0 rounded-xl border border-gray-100 bg-gray-50 p-3 transition-colors hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {a.profileImage ? (
                  <img src={a.profileImage} alt={a.title} className="mb-2 aspect-square w-full rounded-lg object-cover" />
                ) : (
                  <div className="mb-2 flex aspect-square w-full items-center justify-center rounded-lg bg-gray-200 text-2xl text-gray-500" aria-hidden="true">👤</div>
                )}
                <p className="truncate text-sm font-medium text-gray-900 group-hover:text-blue-600">{a.title}</p>
                {a.introduce && <p className="truncate text-xs text-gray-500">{a.introduce}</p>}
                {a.regionName && <p className="mt-1 text-[10px] text-blue-500">{a.regionName}</p>}
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
    <div className="mb-5 flex flex-col items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-center" role="alert">
      <p className="text-sm font-medium text-gray-700">로그인 후 시뮬레이션을 이용할 수 있습니다</p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 focus-visible:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">로그인</Link>
        <button type="button" onClick={props.onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">닫기</button>
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
  const [area] = useState<SimArea>("eyebrow");
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
    try {
      const optimized = await optimizeImage(file, { maxWidth: 2048, quality: 0.9 });
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") return;
        const base64 = result.split(",")[1] ?? "";
        startProcessing(base64, area);
      };
      reader.readAsDataURL(optimized);
    } catch {
      setErrorMsg("이미지를 처리할 수 없습니다. 다른 사진을 선택해주세요.");
      setPhase("error");
    }
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
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6 md:pt-8">
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}

      {phase === "upload" && (
        <HeroUploadSection onFile={handleFile} onCamera={handleCameraOpen} />
      )}

      {phase === "camera" && (
        <CameraCapture onCapture={handleCapture} onCancel={() => setPhase("upload")} onError={handleCameraError} />
      )}

      {isProcessing && (
        <ProcessingView
          phase={phase}
          progressText={progressText}
          elapsedSeconds={elapsedSeconds}
          completedStyles={completedStyles}
          totalStyles={totalStyles}
        />
      )}

      {phase === "done" && (
        <ResultsView
          area={area} originalBase64={originalBase64} cleanedBase64={cleanedBase64}
          results={results} selectedIdx={selectedIdx} onSelect={setSelectedIdx} onReset={reset}
          onZoom={handleZoom} artists={props.artists}
        />
      )}

      {phase === "error" && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center" role="alert">
          <p className="text-sm font-medium text-red-600">{errorMsg}</p>
          <button type="button" onClick={reset} className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">다시 시도</button>
        </div>
      )}

      {zoomImage && (
        <ImageZoomModal src={zoomImage.src} alt={zoomImage.alt} onClose={() => setZoomImage(null)} />
      )}
    </div>
  );
}
