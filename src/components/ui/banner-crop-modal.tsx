// @client-reason: react-easy-crop requires client-side rendering for canvas cropping
"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";

const BANNER_ASPECT = 3 / 1;
const OUTPUT_WIDTH = 1020;
const OUTPUT_HEIGHT = 340;

interface BannerCropModalProps {
  imageSrc: string;
  onComplete: (croppedFile: File) => void;
  onCancel: () => void;
}

function getCroppedCanvas(imageSrc: string, crop: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = globalThis.document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }

      ctx.drawImage(
        img,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT,
      );

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      }, "image/jpeg", 0.92);
    };
    img.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
    img.src = imageSrc;
  });
}

export function BannerCropModal({
  imageSrc,
  onComplete,
  onCancel,
}: Readonly<BannerCropModalProps>): React.ReactElement {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const handleConfirm = async (): Promise<void> => {
    if (!croppedArea) return;
    setIsSaving(true);
    try {
      const blob = await getCroppedCanvas(imageSrc, croppedArea);
      const file = new File([blob], `banner_${Date.now()}.jpg`, { type: "image/jpeg" });
      onComplete(file);
    } catch {
      globalThis.alert("크롭 처리에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-medium text-white">
          배너 영역을 선택하세요 (3:1 비율)
        </p>
        <p className="text-xs text-white/60">
          {OUTPUT_WIDTH} × {OUTPUT_HEIGHT}px
        </p>
      </div>

      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={BANNER_ASPECT}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-2">
        <span className="text-xs text-white/60">축소</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-1 flex-1 appearance-none rounded-full bg-white/30 accent-white"
          aria-label="확대/축소"
        />
        <span className="text-xs text-white/60">확대</span>
      </div>

      <div className="flex gap-3 px-4 pb-6 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-white/30 text-white hover:bg-white/10 focus-visible:bg-white/10"
        >
          취소
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={isSaving}
          className="flex-1 bg-brand-primary text-white hover:bg-brand-primary-hover focus-visible:bg-brand-primary-hover"
        >
          {isSaving ? "처리 중..." : "확인"}
        </Button>
      </div>
    </div>
  );
}
