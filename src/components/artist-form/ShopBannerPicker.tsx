// @client-reason: AI 배너 생성 / 직접 업로드 탭 + 미리보기 (인터랙션 기반)
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Sparkles, Loader2, Upload } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

function AiGeneratePanel({ generating, hasPreview, error, onGenerate }: Readonly<{
  generating: boolean;
  hasPreview: boolean;
  error: string | null;
  onGenerate: () => void;
}>): React.ReactElement {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">샵 이름·시술 정보로 AI가 대표 배너를 만들어드려요. 마음에 들 때까지 다시 생성할 수 있어요.</p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        aria-busy={generating}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
        {generateLabel(generating, hasPreview)}
      </button>
      {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

function UploadPanel({ onUpload }: Readonly<{
  onUpload: (files: Array<File | { url: string; id?: string }>) => void;
}>): React.ReactElement {
  return (
    <div className="space-y-2">
      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">⚠ 권장 1020 × 340px (가로:세로 3:1). 3:1 비율로 잘립니다.</p>
      <ImageUpload maxLength={1} onChange={onUpload} cropAspect={3} />
    </div>
  );
}

interface ShopBannerPickerProps {
  shopName: string;
  category?: string;
  atmosphere?: string;
  initialUrl?: string; // 수정 시 기존 배너
  onChange: (file: File | null) => void;
}

type Tab = "ai" | "upload";

// base64 data URL → File (fetch 우회 — 효율 + 임의 URL fetch 차단).
function dataUrlToFile(dataUrl: string): File {
  const base64 = dataUrl.split(",", 2)[1] ?? "";
  const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
  return new File([bytes], `banner_${Date.now()}.webp`, { type: "image/webp" });
}

function generateLabel(generating: boolean, hasPreview: boolean): string {
  if (generating) return "배너 생성 중... (최대 1분)";
  return hasPreview ? "다시 생성하기" : "AI로 배너 생성하기";
}

function tabClass(active: boolean): string {
  return `flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    active ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-border text-muted-foreground hover:bg-muted"
  }`;
}

function BannerPreview({ src }: Readonly<{ src: string | null }>): React.ReactElement {
  if (!src) {
    return (
      <div className="flex aspect-[3/1] w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted text-xs text-muted-foreground">
        배너를 생성하거나 직접 올려주세요
      </div>
    );
  }
  return (
    <div className="relative aspect-[3/1] w-full overflow-hidden rounded-lg border border-border bg-muted">
      <Image src={src} alt="대표 배너 미리보기" fill className="object-cover" sizes="(max-width: 767px) 100vw, 1020px" unoptimized />
    </div>
  );
}

export function ShopBannerPicker({
  shopName, category = "", atmosphere = "", initialUrl, onChange,
}: Readonly<ShopBannerPickerProps>): React.ReactElement {
  const [tab, setTab] = useState<Tab>("ai");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  // 업로드 미리보기 blob URL 추적 — 교체/언마운트 시 revoke(메모리 누수 방지).
  const blobUrlRef = useRef<string | null>(null);
  const revokeBlob = useCallback(() => {
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
  }, []);
  useEffect(() => revokeBlob, [revokeBlob]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 150_000);
    try {
      const res = await fetch("/api/ai/generate-shop-banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopName, category, atmosphere }),
        signal: controller.signal,
      });
      const data = await res.json() as { image?: string; error?: string };
      if (!res.ok || !data.image) {
        setError(data.error ?? "배너 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      revokeBlob();
      setPreview(data.image);
      onChange(dataUrlToFile(data.image));
    } catch {
      setError("배너 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      clearTimeout(timer);
      setGenerating(false);
    }
  }, [shopName, category, atmosphere, onChange, revokeBlob]);

  const handleUpload = useCallback((files: Array<File | { url: string; id?: string }>) => {
    const file = files.find((f): f is File => f instanceof File) ?? null;
    revokeBlob();
    if (file) {
      const url = URL.createObjectURL(file);
      blobUrlRef.current = url;
      setPreview(url);
      onChange(file);
    } else {
      setPreview(initialUrl ?? null);
      onChange(null);
    }
  }, [onChange, initialUrl, revokeBlob]);

  return (
    <div className="space-y-3">
      <BannerPreview src={preview} />

      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("ai")} aria-pressed={tab === "ai"} className={tabClass(tab === "ai")}>
          <Sparkles className="h-4 w-4" aria-hidden="true" /> AI로 만들기
        </button>
        <button type="button" onClick={() => setTab("upload")} aria-pressed={tab === "upload"} className={tabClass(tab === "upload")}>
          <Upload className="h-4 w-4" aria-hidden="true" /> 직접 올리기
        </button>
      </div>

      {tab === "ai" ? (
        <AiGeneratePanel generating={generating} hasPreview={!!preview} error={error} onGenerate={() => void handleGenerate()} />
      ) : (
        <UploadPanel onUpload={handleUpload} />
      )}
    </div>
  );
}
