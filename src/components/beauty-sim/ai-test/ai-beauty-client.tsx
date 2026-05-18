"use client";
// @client-reason: Camera/file input, MediaPipe face analysis, canvas mask generation, interactive AI simulation UI

import { useState, useRef, useCallback, useEffect } from "react";
import {
  initFaceAnalysis,
  analyzeFace,
  generateMask,
  loadImage,
} from "@/lib/face-analysis";
import { optimizeImage } from "@/lib/utils/image-optimizer";

/* eslint-disable @next/next/no-img-element -- base64 data URIs from AI generation */

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = "upload" | "camera" | "analyzing" | "removing" | "simulating" | "done" | "error";
type SimArea = "eyebrow" | "lip";

interface SimResult {
  id: string;
  name: string;
  image: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const EYEBROW_STYLES = [
  { id: "natural-arch", name: "내추럴 아치" },
  { id: "straight", name: "일자 눈썹" },
  { id: "soft-arch", name: "소프트 아치" },
  { id: "feathered", name: "페더링" },
  { id: "bold-arch", name: "볼드 아치" },
] as const;

const LIP_STYLES = [
  { id: "natural-pink", name: "내추럴 핑크" },
  { id: "coral", name: "코랄" },
  { id: "rose", name: "로즈" },
  { id: "mlbb", name: "MLBB" },
  { id: "brick-red", name: "브릭레드" },
] as const;

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
): Promise<{ cleanedBase64: string; results: SimResult[] }> {
  onProgress("analyzing", "AI가 얼굴을 분석하고 있습니다...");

  const img = await loadImage(`data:image/png;base64,${base64}`);
  await initFaceAnalysis();
  const faceResult = analyzeFace(img);
  if (!faceResult) throw new Error("얼굴을 감지하지 못했습니다. 정면 사진으로 다시 시도해주세요.");

  const maskArea = area === "lip" ? "lip" as const : "eyebrow" as const;
  const mask = generateMask(faceResult.landmarks, maskArea, img.width, img.height);

  onProgress(
    "removing",
    area === "eyebrow" ? "AI가 눈썹을 자연스럽게 제거하고 있습니다..." : "AI가 입술을 분석하고 있습니다...",
  );
  const cleaned = await callSimApi(base64, mask, "remove");

  onProgress("simulating", "AI가 다양한 스타일을 시뮬레이션하고 있습니다...");
  const styles = area === "eyebrow" ? EYEBROW_STYLES : LIP_STYLES;
  const settled = await Promise.allSettled(
    styles.map(async (s): Promise<SimResult> => ({
      id: s.id,
      name: s.name,
      image: await callSimApi(cleaned, mask, "simulate", s.id),
    })),
  );

  const results: SimResult[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") results.push(r.value);
  }
  if (results.length === 0) throw new Error("시뮬레이션 생성에 실패했습니다.");

  return { cleanedBase64: cleaned, results };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StepDot(props: Readonly<{ active: boolean; done: boolean; label: string }>): React.ReactElement {
  let bg = "bg-white/20";
  if (props.done) bg = "bg-green-400";
  else if (props.active) bg = "bg-purple-400";
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
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl bg-purple-500 px-6 py-3 text-sm font-medium text-white hover:bg-purple-400 focus-visible:bg-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300">사진 선택</button>
          <button type="button" onClick={props.onCamera} className="rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-white/20 focus-visible:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300">셀카 촬영</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) props.onFile(f); }} className="hidden" aria-label="사진 파일 선택" />
      </div>
    </>
  );
}

function ProcessingView(props: Readonly<{
  phase: Phase;
  originalBase64: string;
  progressText: string;
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
      {props.originalBase64 && (
        <img src={`data:image/png;base64,${props.originalBase64}`} alt="원본" className="w-full rounded-2xl" />
      )}
      <div className="flex items-center gap-3 text-white" role="status" aria-live="polite">
        <div className="h-5 w-5 motion-safe:animate-spin rounded-full border-2 border-white/30 border-t-purple-400" aria-hidden="true" />
        <span className="text-sm">{props.progressText}</span>
      </div>
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
}>): React.ReactElement {
  const selected = props.results[props.selectedIdx];
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-center text-xs font-medium text-gray-400">원본</p>
          <img src={`data:image/png;base64,${props.originalBase64}`} alt="원본" className="w-full rounded-xl" />
        </div>
        <div>
          <p className="mb-1 text-center text-xs font-medium text-gray-400">{props.area === "eyebrow" ? "눈썹 제거" : "입술 분석"}</p>
          <img src={`data:image/png;base64,${props.cleanedBase64}`} alt="제거 결과" className="w-full rounded-xl" />
        </div>
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
              <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-300">AI 생성</span>
            </div>
            <img src={`data:image/png;base64,${selected.image}`} alt={`${selected.name} 결과`} className="w-full rounded-2xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-center text-xs font-medium text-purple-300">Before</p>
              <img src={`data:image/png;base64,${props.originalBase64}`} alt="원본" className="w-full rounded-xl" />
            </div>
            <div>
              <p className="mb-1 text-center text-xs font-medium text-purple-300">After</p>
              <img src={`data:image/png;base64,${selected.image}`} alt="결과" className="w-full rounded-xl" />
            </div>
          </div>
        </>
      )}

      <div className="flex justify-center">
        <button type="button" onClick={props.onReset} className="rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-white/20 focus-visible:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300">다시 하기</button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AiBeautyClient(): React.ReactElement {
  const [phase, setPhase] = useState<Phase>("upload");
  const [area, setArea] = useState<SimArea>("eyebrow");
  const [originalBase64, setOriginalBase64] = useState("");
  const [cleanedBase64, setCleanedBase64] = useState("");
  const [results, setResults] = useState<SimResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [progressText, setProgressText] = useState("");

  const startProcessing = useCallback(async (base64: string, simArea: SimArea) => {
    setOriginalBase64(base64);
    try {
      const output = await runSimulationPipeline(base64, simArea, (p, text) => {
        setPhase(p);
        setProgressText(text);
      });
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
    const optimized = await optimizeImage(file, { maxWidth: 2048, quality: 0.9 });
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      const base64 = result.split(",")[1] ?? "";
      startProcessing(base64, area);
    };
    reader.readAsDataURL(optimized);
  }, [startProcessing, area]);

  const handleCapture = useCallback((base64: string) => {
    setPhase("analyzing");
    startProcessing(base64, area);
  }, [startProcessing, area]);

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
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white md:text-3xl">AI 뷰티 시뮬레이션</h1>
        <p className="mt-2 text-sm text-gray-300">GPT AI가 눈썹/입술을 자연스럽게 제거하고 새로운 스타일을 시뮬레이션합니다</p>
      </header>

      {phase === "upload" && (
        <UploadSection area={area} onAreaChange={setArea} onFile={handleFile} onCamera={() => setPhase("camera")} />
      )}

      {phase === "camera" && (
        <CameraCapture onCapture={handleCapture} onCancel={() => setPhase("upload")} onError={handleCameraError} />
      )}

      {(phase === "analyzing" || phase === "removing" || phase === "simulating") && (
        <ProcessingView phase={phase} originalBase64={originalBase64} progressText={progressText} />
      )}

      {phase === "done" && (
        <ResultsView
          area={area} originalBase64={originalBase64} cleanedBase64={cleanedBase64}
          results={results} selectedIdx={selectedIdx} onSelect={setSelectedIdx} onReset={reset}
        />
      )}

      {phase === "error" && (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-red-500/10 p-8 text-center" role="alert">
          <p className="text-sm text-red-300">{errorMsg}</p>
          <button type="button" onClick={reset} className="rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-white/20 focus-visible:bg-white/20">다시 시도</button>
        </div>
      )}
    </div>
  );
}
