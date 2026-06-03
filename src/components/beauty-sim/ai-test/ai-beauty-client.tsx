// @client-reason: Camera/file input, MediaPipe face analysis, canvas mask generation, interactive AI simulation UI
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { Download, X, ExternalLink, Camera, ImageIcon, Brain } from "lucide-react";
import {
  initFaceAnalysis,
  analyzeFace,
  generateMask,
  generateTightBrowMask,
  loadImage,
} from "@/lib/face-analysis";
import { optimizeImage } from "@/lib/utils/image-optimizer";
import {
  DEFAULT_QUOTAS,
  areaLabel,
  otherArea,
  remainingFor,
  withRemaining,
  type Quotas,
  type SimArea,
} from "@/lib/beauty-sim/shared";

/* eslint-disable @next/next/no-img-element -- base64 data URIs from AI generation */

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = "upload" | "camera" | "analyzing" | "removing" | "simulating" | "done" | "error";

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
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size);
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

// ─── Quota (영역별 일일 횟수) — 사전확인(GET) → 결과 획득 후 커밋(POST) ─────────────

const QUOTA_URL = "/api/ai/beauty-sim-v2/quota";

/** 한도 초과 시 파이프라인 중단용 (커밋 전이라 차감 안 됨) */
class QuotaError extends Error {
  readonly quotas: Quotas;
  constructor(quotas: Quotas) {
    super("quota_exceeded");
    this.name = "QuotaError";
    this.quotas = quotas;
  }
}

/** 잔여 횟수 조회 (미차감). 마운트 표시 + 파이프라인 시작 전 사전 확인용. */
async function fetchQuotas(): Promise<Quotas | null> {
  try {
    const res = await fetch(QUOTA_URL, { method: "GET" });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { quotas?: Quotas } | null;
    return data?.quotas ?? null;
  } catch {
    return null;
  }
}

/** 결과를 완전히 얻은 후 1회 커밋(차감). best-effort — 해당 영역 잔여 반환(실패 시 null). */
async function commitQuota(area: SimArea): Promise<number | null> {
  try {
    const res = await fetch(QUOTA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area }),
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { remaining?: number } | null;
    return typeof data?.remaining === "number" ? data.remaining : null;
  } catch {
    return null;
  }
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

function collectFulfilled(settled: PromiseSettledResult<SimResult>[]): SimResult[] {
  const results: SimResult[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") results.push(r.value);
  }
  if (results.length === 0) throw new Error("시뮬레이션 생성에 실패했습니다.");
  return results;
}

async function generateBrowStyles(
  cleaned: string,
  tightMask: string,
  onStyleComplete?: (completed: number, total: number) => void,
): Promise<SimResult[]> {
  let completedCount = 0;
  onStyleComplete?.(0, EYEBROW_STYLES.length);
  const settled = await Promise.allSettled(
    EYEBROW_STYLES.map(async (s): Promise<SimResult> => {
      const image = await callSimApi(cleaned, tightMask, "simulate", s.id);
      completedCount += 1;
      onStyleComplete?.(completedCount, EYEBROW_STYLES.length);
      return { id: s.id, name: s.name, image };
    }),
  );
  return collectFulfilled(settled);
}

async function generateLipStyles(
  cleaned: string,
  mask: string,
  onStyleComplete?: (completed: number, total: number) => void,
): Promise<SimResult[]> {
  let completedCount = 0;
  onStyleComplete?.(0, LIP_STYLES.length);
  const settled = await Promise.allSettled(
    LIP_STYLES.map(async (s): Promise<SimResult> => {
      const image = await callSimApi(cleaned, mask, "simulate", s.id);
      completedCount += 1;
      onStyleComplete?.(completedCount, LIP_STYLES.length);
      return { id: s.id, name: s.name, image };
    }),
  );
  return collectFulfilled(settled);
}

async function runSimulationPipeline(
  base64: string,
  area: SimArea,
  onProgress: (phase: Phase, text: string) => void,
  gate: () => Promise<void>,
  onStyleComplete?: (completed: number, total: number) => void,
): Promise<{ croppedOriginal: string; cleanedBase64: string; results: SimResult[] }> {
  // 사전 확인: 한도 초과면 어떤 작업도 시작하지 않고 즉시 중단(차감 없음).
  await gate();

  onProgress("analyzing", "얼굴 윤곽을 정밀 스캔하고 있습니다");

  const cropped = await cropToSquare(base64);
  const img = await loadImage(`data:image/png;base64,${cropped}`);
  await initFaceAnalysis();
  const faceResult = analyzeFace(img);
  if (!faceResult) throw new Error("얼굴을 감지하지 못했습니다. 정면 사진으로 다시 시도해주세요.");

  if (area === "eyebrow") {
    const wideMask = generateMask(faceResult.landmarks, "eyebrow", img.width, img.height);
    onProgress("removing", "피부 톤을 보정하고 있습니다");
    const cleaned = await callSimApi(cropped, wideMask, "remove");

    onProgress("simulating", "맞춤 스타일을 시뮬레이션하고 있습니다");
    const tightMask = generateTightBrowMask(faceResult.landmarks, img.width, img.height);
    const results = await generateBrowStyles(cleaned, tightMask, onStyleComplete);
    return { croppedOriginal: cropped, cleanedBase64: cleaned, results };
  }

  // 입술: remove 불필요 — 원본에 바로 스타일 적용
  const lipMask = generateMask(faceResult.landmarks, "lip", img.width, img.height);
  onProgress("simulating", "맞춤 입술 스타일을 시뮬레이션하고 있습니다");
  const results = await generateLipStyles(cropped, lipMask, onStyleComplete);
  return { croppedOriginal: cropped, cleanedBase64: cropped, results };
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
        if (!navigator.mediaDevices?.getUserMedia) {
          props.onError("이 브라우저에서는 카메라를 사용할 수 없습니다. 사진 불러오기를 이용해주세요.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError") {
          props.onError("카메라 권한이 거부되었습니다. 브라우저 주소창 왼쪽 자물쇠 아이콘 → 카메라 허용 후 새로고침해주세요.");
        } else if (name === "NotFoundError") {
          props.onError("카메라를 찾을 수 없습니다. 사진 불러오기를 이용해주세요.");
        } else {
          props.onError("카메라를 시작할 수 없습니다. 사진 불러오기를 이용해주세요.");
        }
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

  return (
    <div
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) props.onFile(f); }}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="relative">
        <picture>
        <source
          srcSet="/images/beauty-sim/hero-banner-512w.avif 512w, /images/beauty-sim/hero-banner.avif 1029w"
          sizes="(max-width: 640px) 100vw, 512px"
          type="image/avif"
        />
        <source
          srcSet="/images/beauty-sim/hero-banner-512w.webp 512w, /images/beauty-sim/hero-banner.webp 1029w"
          sizes="(max-width: 640px) 100vw, 512px"
          type="image/webp"
        />
        <img
          src="/images/beauty-sim/hero-banner.png"
          srcSet="/images/beauty-sim/hero-banner-512w.png 512w, /images/beauty-sim/hero-banner.png 1029w"
          sizes="(max-width: 640px) 100vw, 512px"
          alt="AI 눈썹·입술 시뮬레이션 — 내 얼굴에 어울리는 반영구 스타일을 미리 체험하세요"
          width={1029}
          height={1134}
          fetchPriority="high"
          className="w-full select-none"
          draggable={false}
        />
      </picture>
        <Link
          href="/"
          className="absolute left-[1.5%] top-[2.5%] z-10 flex h-[7%] w-[8%] items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          aria-label="홈으로 돌아가기"
        >
          <span className="sr-only">홈으로 돌아가기</span>
        </Link>
      </div>

      <div className="flex gap-3 px-4 py-4">
        <button
          type="button"
          onClick={props.onCamera}
          className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#6999f6] px-4 py-5 text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        >
          <Camera className="h-8 w-8" aria-hidden="true" />
          <span className="text-base font-bold">지금 촬영하기</span>
          <span className="text-xs opacity-80">카메라로 바로 촬영</span>
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-blue-100 bg-white/90 px-4 py-5 text-blue-900 shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        >
          <ImageIcon className="h-8 w-8 text-blue-400" aria-hidden="true" />
          <span className="text-base font-bold">사진 불러오기</span>
          <span className="text-xs text-blue-600/70">앨범에서 선택</span>
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) props.onFile(f); }} className="hidden" aria-label="사진 파일 선택" />
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

function WaitTimeAds(): React.ReactElement {
  const [adIdx, setAdIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setAdIdx((i) => (i + 1) % AD_CARDS.length);
    }, AD_ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  // eslint-disable-next-line security/detect-object-injection -- 숫자 인덱스(adIdx) 로 상수 배열 AD_CARDS 접근, 외부 입력 아님
  const ad = AD_CARDS[adIdx];

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-[10px] text-gray-500">기다리는 동안 둘러보세요</p>
      <a
        href={ad.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${ad.title} - ${ad.subtitle} (새 탭에서 열림)`}
        className={`block rounded-2xl border-2 p-4 shadow-md transition-all hover:scale-[1.02] focus-visible:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
          ad.id === "dolpagu"
            ? "border-blue-300 bg-gradient-to-r from-blue-200 to-sky-200"
            : "border-green-300 bg-gradient-to-r from-green-200 to-emerald-200"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-base font-bold ${ad.id === "dolpagu" ? "text-blue-800" : "text-green-800"}`}>{ad.title}</p>
            <p className="text-sm font-medium text-gray-900">{ad.subtitle}</p>
            <p className="mt-1 text-xs text-gray-700">{ad.description}</p>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-gray-600" aria-hidden="true" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ad.tags.map((tag) => (
            <span key={tag} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              ad.id === "dolpagu" ? "bg-blue-400 text-white" : "bg-green-400 text-white"
            }`}>
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
        <h2 className="flex items-center justify-center gap-3 text-lg font-bold text-gray-900 md:text-xl">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 shadow-md shadow-violet-200/50 animate-breathe" aria-hidden="true">
            <Brain className="h-6 w-6 text-violet-600" />
          </span>
          AI 분석 중
        </h2>
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

function ResultImageCard(props: Readonly<{
  selected: SimResult;
  originalBase64: string;
  onZoom: (src: string, alt: string) => void;
}>): React.ReactElement {
  const [showBefore, setShowBefore] = useState(false);
  const displaySrc = showBefore ? props.originalBase64 : props.selected.image;
  const displayLabel = showBefore ? "원본" : props.selected.name;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">{props.selected.name}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadBase64Image(props.selected.image, `beauty-sim-${props.selected.id}.png`)}
            className="rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200 focus-visible:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="결과 이미지 저장"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
      <button type="button" onClick={() => props.onZoom(displaySrc, displayLabel)} className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-2xl" aria-label={`${displayLabel} 확대`}>
        <div className="aspect-square w-full overflow-hidden rounded-2xl">
          <img src={`data:image/png;base64,${displaySrc}`} alt={displayLabel} className="h-full w-full object-cover" />
        </div>
      </button>
      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setShowBefore(false)}
          aria-pressed={!showBefore}
          className={`rounded-full px-4 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
            !showBefore ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 focus-visible:bg-gray-200"
          }`}
        >
          After
        </button>
        <button
          type="button"
          onClick={() => setShowBefore(true)}
          aria-pressed={showBefore}
          className={`rounded-full px-4 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
            showBefore ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 focus-visible:bg-gray-200"
          }`}
        >
          Before
        </button>
      </div>
    </div>
  );
}

function ResultsView(props: Readonly<{
  originalBase64: string;
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
        <ResultImageCard
          selected={selected}
          originalBase64={props.originalBase64}
          onZoom={props.onZoom}
        />
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
                <p className="truncate text-sm font-medium text-gray-900 group-hover:text-blue-600 group-focus-visible:text-blue-600">{a.title}</p>
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

function LimitPrompt(props: Readonly<{ area: SimArea; quotas: Quotas; onClose: () => void }>): React.ReactElement {
  const other = otherArea(props.area);
  const otherRemaining = remainingFor(props.quotas, other);
  const allExhausted = props.quotas.eyebrow <= 0 && props.quotas.lip <= 0;

  return (
    <div className="mb-5 flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center" role="alert" aria-live="assertive">
      {allExhausted ? (
        <p className="text-sm font-medium text-gray-700">
          오늘 사용 횟수를 모두 사용했어요.
          <br />
          내일 0시(자정) 이후 다시 이용할 수 있어요.
        </p>
      ) : (
        <p className="text-sm font-medium text-gray-700">
          오늘 {areaLabel(props.area)} 시뮬레이션을 모두 사용했어요.
          <br />
          {areaLabel(other)}은 {otherRemaining}회 남았어요.
        </p>
      )}
      <button type="button" onClick={props.onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">닫기</button>
    </div>
  );
}

function UploadPhaseView(props: Readonly<{
  area: SimArea;
  quotas: Quotas;
  onFile: (f: File) => void;
  onCamera: () => void;
  onAreaChange: (area: SimArea) => void;
}>): React.ReactElement {
  return (
    <>
      <HeroUploadSection onFile={props.onFile} onCamera={props.onCamera} />
      <div className="mx-auto mt-4 flex w-fit gap-1 rounded-full bg-gray-100 p-1" role="radiogroup" aria-label="시술 영역 선택">
        <button
          type="button" role="radio" aria-checked={props.area === "eyebrow"} aria-label="눈썹"
          onClick={() => props.onAreaChange("eyebrow")}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
            props.area === "eyebrow" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          눈썹
        </button>
        <button
          type="button" role="radio" aria-checked={props.area === "lip"} aria-label="입술"
          onClick={() => props.onAreaChange("lip")}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
            props.area === "lip" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          입술
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-gray-500" aria-live="polite">
        오늘 남은 횟수 — 눈썹 {props.quotas.eyebrow}회 · 입술 {props.quotas.lip}회
      </p>
    </>
  );
}

function ErrorView(props: Readonly<{ message: string; onReset: () => void }>): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center" role="alert">
      <p className="text-sm font-medium text-red-600">{props.message}</p>
      <button type="button" onClick={props.onReset} className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">다시 시도</button>
    </div>
  );
}

interface AiBeautyViewProps {
  phase: Phase;
  area: SimArea;
  quotas: Quotas;
  isProcessing: boolean;
  progressText: string;
  elapsedSeconds: number;
  completedStyles: number;
  totalStyles: number;
  originalBase64: string;
  results: SimResult[];
  selectedIdx: number;
  errorMsg: string;
  zoomImage: { src: string; alt: string } | null;
  limitInfo: { area: SimArea; quotas: Quotas } | null;
  artists: RecommendedArtist[];
  onFile: (f: File) => void;
  onCameraOpen: () => void;
  onAreaChange: (area: SimArea) => void;
  onCapture: (base64: string) => void;
  onCameraCancel: () => void;
  onCameraError: (msg: string) => void;
  onSelect: (idx: number) => void;
  onReset: () => void;
  onZoom: (src: string, alt: string) => void;
  onZoomClose: () => void;
  onLimitClose: () => void;
}

function AiBeautyView(props: Readonly<AiBeautyViewProps>): React.ReactElement {
  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6 md:pt-8">
      {props.limitInfo && <LimitPrompt area={props.limitInfo.area} quotas={props.limitInfo.quotas} onClose={props.onLimitClose} />}

      {props.phase === "upload" && (
        <UploadPhaseView
          area={props.area}
          quotas={props.quotas}
          onFile={props.onFile}
          onCamera={props.onCameraOpen}
          onAreaChange={props.onAreaChange}
        />
      )}

      {props.phase === "camera" && (
        <CameraCapture onCapture={props.onCapture} onCancel={props.onCameraCancel} onError={props.onCameraError} />
      )}

      {props.isProcessing && (
        <ProcessingView
          phase={props.phase}
          progressText={props.progressText}
          elapsedSeconds={props.elapsedSeconds}
          completedStyles={props.completedStyles}
          totalStyles={props.totalStyles}
        />
      )}

      {props.phase === "done" && (
        <ResultsView
          originalBase64={props.originalBase64}
          results={props.results} selectedIdx={props.selectedIdx} onSelect={props.onSelect} onReset={props.onReset}
          onZoom={props.onZoom} artists={props.artists}
        />
      )}

      {props.phase === "error" && <ErrorView message={props.errorMsg} onReset={props.onReset} />}

      {props.zoomImage && (
        <ImageZoomModal src={props.zoomImage.src} alt={props.zoomImage.alt} onClose={props.onZoomClose} />
      )}
    </div>
  );
}

// ─── State Hook ──────────────────────────────────────────────────────────────

interface BeautySimState {
  phase: Phase;
  area: SimArea;
  quotas: Quotas;
  isProcessing: boolean;
  progressText: string;
  elapsedSeconds: number;
  completedStyles: number;
  totalStyles: number;
  originalBase64: string;
  results: SimResult[];
  selectedIdx: number;
  errorMsg: string;
  zoomImage: { src: string; alt: string } | null;
  limitInfo: { area: SimArea; quotas: Quotas } | null;
  setArea: (area: SimArea) => void;
  setSelectedIdx: (idx: number) => void;
  handleFile: (file: File) => void;
  handleCapture: (base64: string) => void;
  handleCameraError: (msg: string) => void;
  handleZoom: (src: string, alt: string) => void;
  handleCameraOpen: () => void;
  handleCameraCancel: () => void;
  handleZoomClose: () => void;
  handleLimitClose: () => void;
  reset: () => void;
}

/** 파이프라인/파일 액션이 사용하는 setter 모음 (모두 React 상태 setter라 참조 안정적). */
interface PipelineSetters {
  setPhase: React.Dispatch<React.SetStateAction<Phase>>;
  setProgressText: React.Dispatch<React.SetStateAction<string>>;
  setOriginalBase64: React.Dispatch<React.SetStateAction<string>>;
  setResults: React.Dispatch<React.SetStateAction<SimResult[]>>;
  setSelectedIdx: React.Dispatch<React.SetStateAction<number>>;
  setCompletedStyles: React.Dispatch<React.SetStateAction<number>>;
  setTotalStyles: React.Dispatch<React.SetStateAction<number>>;
  setQuotas: React.Dispatch<React.SetStateAction<Quotas>>;
  setLimitInfo: React.Dispatch<React.SetStateAction<{ area: SimArea; quotas: Quotas } | null>>;
  setErrorMsg: React.Dispatch<React.SetStateAction<string>>;
}

interface PipelineActions {
  startProcessing: (base64: string, simArea: SimArea) => void;
  handleFile: (file: File) => void;
  handleCapture: (base64: string) => void;
}

/** 이미지 → 파이프라인 실행/커밋, 파일 입력 처리. setter(참조 안정) + area 만 의존. */
function useSimPipeline(area: SimArea, setters: Readonly<PipelineSetters>): PipelineActions {
  const {
    setPhase, setProgressText, setOriginalBase64, setResults, setSelectedIdx,
    setCompletedStyles, setTotalStyles, setQuotas, setLimitInfo, setErrorMsg,
  } = setters;

  const startProcessing = useCallback(async (base64: string, simArea: SimArea): Promise<void> => {
    setOriginalBase64(base64);
    setCompletedStyles(0);
    setTotalStyles(simArea === "eyebrow" ? EYEBROW_STYLES.length : LIP_STYLES.length);
    try {
      const output = await runSimulationPipeline(
        base64,
        simArea,
        (p, text) => { setPhase(p); setProgressText(text); },
        // 사전 확인(차감 X): 한도 초과면 QuotaError 로 중단
        async () => {
          const q = await fetchQuotas();
          if (q) setQuotas(q);
          if (q && remainingFor(q, simArea) <= 0) throw new QuotaError(q);
        },
        (completed) => { setCompletedStyles(completed); },
      );
      setOriginalBase64(output.croppedOriginal);
      setResults(output.results);
      setSelectedIdx(0);
      setPhase("done");
      // 결과를 완전히 얻음 → 1회 커밋(차감). best-effort.
      void commitQuota(simArea).then((rem) => {
        if (rem !== null) setQuotas((prev) => withRemaining(prev, simArea, rem));
      });
    } catch (err: unknown) {
      if (err instanceof QuotaError) {
        setQuotas(err.quotas);
        setLimitInfo({ area: simArea, quotas: err.quotas });
        setPhase("upload");
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : "처리 중 오류가 발생했습니다.");
      setPhase("error");
    }
  }, [setPhase, setProgressText, setOriginalBase64, setResults, setSelectedIdx, setCompletedStyles, setTotalStyles, setQuotas, setLimitInfo, setErrorMsg]);

  const handleFile = useCallback(async (file: File): Promise<void> => {
    if (!file.type.startsWith("image/")) return;
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
  }, [startProcessing, area, setErrorMsg, setPhase]);

  const handleCapture = useCallback((base64: string): void => {
    setPhase("analyzing");
    startProcessing(base64, area);
  }, [startProcessing, area, setPhase]);

  return { startProcessing, handleFile, handleCapture };
}

function useBeautySim(): BeautySimState {
  const [phase, setPhase] = useState<Phase>("upload");
  const [area, setArea] = useState<SimArea>("eyebrow");
  const [originalBase64, setOriginalBase64] = useState("");
  const [results, setResults] = useState<SimResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [progressText, setProgressText] = useState("");
  const [completedStyles, setCompletedStyles] = useState(0);
  const [totalStyles, setTotalStyles] = useState(8);
  const [zoomImage, setZoomImage] = useState<{ src: string; alt: string } | null>(null);
  const [quotas, setQuotas] = useState<Quotas>(DEFAULT_QUOTAS);
  const [limitInfo, setLimitInfo] = useState<{ area: SimArea; quotas: Quotas } | null>(null);

  const isProcessing = PROCESSING_PHASES.has(phase);
  const elapsedSeconds = useElapsedTimer(isProcessing);

  // 잔여 횟수 초기화 — 페이지는 ISR 캐시(revalidate=300)라 쿼터는 식별자(쿠키/세션)별로
  // 클라이언트에서 조회해야 하며, GET 시 익명 쿠키도 발급된다.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const q = await fetchQuotas();
      if (!cancelled && q) setQuotas(q);
    })();
    return () => { cancelled = true; };
  }, []);

  const { handleFile, handleCapture } = useSimPipeline(area, {
    setPhase, setProgressText, setOriginalBase64, setResults, setSelectedIdx,
    setCompletedStyles, setTotalStyles, setQuotas, setLimitInfo, setErrorMsg,
  });

  const handleCameraError = useCallback((msg: string): void => {
    setErrorMsg(msg);
    setPhase("error");
  }, []);

  const reset = useCallback((): void => {
    setPhase("upload");
    setOriginalBase64("");
    setResults([]);
    setSelectedIdx(0);
    setErrorMsg("");
    setProgressText("");
    setCompletedStyles(0);
  }, []);

  const handleZoom = useCallback((src: string, alt: string): void => {
    setZoomImage({ src: `data:image/png;base64,${src}`, alt });
  }, []);

  const handleCameraOpen = useCallback((): void => {
    setPhase("camera");
  }, []);

  const handleCameraCancel = useCallback((): void => {
    setPhase("upload");
  }, []);

  const handleZoomClose = useCallback((): void => {
    setZoomImage(null);
  }, []);

  const handleLimitClose = useCallback((): void => {
    setLimitInfo(null);
  }, []);

  return {
    phase, area, quotas, isProcessing, progressText, elapsedSeconds,
    completedStyles, totalStyles, originalBase64, results, selectedIdx,
    errorMsg, zoomImage, limitInfo,
    setArea, setSelectedIdx,
    handleFile, handleCapture, handleCameraError, handleZoom,
    handleCameraOpen, handleCameraCancel, handleZoomClose, handleLimitClose, reset,
  };
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AiBeautyClient(props: Readonly<{
  artists: RecommendedArtist[];
}>): React.ReactElement {
  const s = useBeautySim();

  return (
    <AiBeautyView
      phase={s.phase}
      area={s.area}
      quotas={s.quotas}
      isProcessing={s.isProcessing}
      progressText={s.progressText}
      elapsedSeconds={s.elapsedSeconds}
      completedStyles={s.completedStyles}
      totalStyles={s.totalStyles}
      originalBase64={s.originalBase64}
      results={s.results}
      selectedIdx={s.selectedIdx}
      errorMsg={s.errorMsg}
      zoomImage={s.zoomImage}
      limitInfo={s.limitInfo}
      artists={props.artists}
      onFile={s.handleFile}
      onCameraOpen={s.handleCameraOpen}
      onAreaChange={s.setArea}
      onCapture={s.handleCapture}
      onCameraCancel={s.handleCameraCancel}
      onCameraError={s.handleCameraError}
      onSelect={s.setSelectedIdx}
      onReset={s.reset}
      onZoom={s.handleZoom}
      onZoomClose={s.handleZoomClose}
      onLimitClose={s.handleLimitClose}
    />
  );
}
