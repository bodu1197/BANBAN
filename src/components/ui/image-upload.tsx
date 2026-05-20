// @client-reason: File input handling and image preview
"use client";

import { useId, useState, useCallback } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BannerCropModal } from "./banner-crop-modal";

interface ImageFile {
  file: File | null;
  preview: string;
  isExisting: boolean;
  id?: string;
}

interface ImageUploadProps {
  maxLength?: number;
  label?: string;
  defaultImages?: Array<{ url: string; id?: string }>;
  onChange: (files: Array<File | { url: string; id?: string }>) => void;
  className?: string;
  validateFile?: (file: File) => Promise<string | null>;
  cropAspect?: number;
}

export function createBannerValidator(errorTemplate: string): (file: File) => Promise<string | null> {
  const TARGET_RATIO = 3;
  const TOLERANCE = 0.3;
  return async (file: File): Promise<string | null> => {
    try {
      const { width, height } = await loadImageDimensions(file);
      const ratio = width / height;
      if (Math.abs(ratio - TARGET_RATIO) > TOLERANCE) {
        return errorTemplate
          .replace("{width}", width.toString())
          .replace("{height}", height.toString());
      }
      return null;
    } catch {
      return "이미지를 읽을 수 없습니다.";
    }
  };
}

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new globalThis.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽을 수 없습니다."));
    };
    img.src = url;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.readAsDataURL(file);
  });
}

/* eslint-disable max-lines-per-function */
export function ImageUpload({
  maxLength = 5,
  label,
  defaultImages = [],
  onChange,
  className,
  validateFile,
  cropAspect,
}: Readonly<ImageUploadProps>): React.ReactElement {
  const id = useId();
  const [files, setFiles] = useState<ImageFile[]>(() => {
    if (defaultImages.length > 0) {
      return defaultImages.map((img, index) => ({
        file: null,
        preview: img.url,
        isExisting: true,
        id: img.id ?? `existing-${index}`,
      }));
    }
    return [];
  });

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropQueue, setCropQueue] = useState<string[]>([]);

  const addCroppedFile = useCallback(
    (croppedFile: File) => {
      const preview = URL.createObjectURL(croppedFile);
      const updated = [...files, { file: croppedFile, preview, isExisting: false }];
      setFiles(updated);
      onChange(updated.map((f) => f.file ?? { url: f.preview, id: f.id }));
    },
    [files, onChange],
  );

  const handleCropComplete = useCallback(
    (croppedFile: File) => {
      addCroppedFile(croppedFile);
      if (cropQueue.length > 0) {
        const [next, ...rest] = cropQueue;
        setCropSrc(next);
        setCropQueue(rest);
      } else {
        setCropSrc(null);
      }
    },
    [addCroppedFile, cropQueue],
  );

  const handleCropCancel = useCallback(() => {
    if (cropQueue.length > 0) {
      const [next, ...rest] = cropQueue;
      setCropSrc(next);
      setCropQueue(rest);
    } else {
      setCropSrc(null);
    }
  }, [cropQueue]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;

      const remainingSlots = maxLength - files.length;
      if (remainingSlots <= 0) {
        globalThis.alert(`최대 ${maxLength}개까지만 첨부할 수 있습니다.`);
        e.target.value = "";
        return;
      }

      const candidates = Array.from(selectedFiles).slice(0, remainingSlots);

      if (cropAspect) {
        const dataUrls: string[] = [];
        for (const file of candidates) {
          dataUrls.push(await readAsDataUrl(file));
        }
        const [first, ...rest] = dataUrls;
        setCropSrc(first);
        setCropQueue(rest);
        e.target.value = "";
        return;
      }

      const newFiles: ImageFile[] = [];
      for (const file of candidates) {
        if (validateFile) {
          const error = await validateFile(file);
          if (error) {
            globalThis.alert(error);
            continue;
          }
        }
        const preview = await readAsDataUrl(file);
        newFiles.push({ file, preview, isExisting: false });
      }

      if (newFiles.length === 0) {
        e.target.value = "";
        return;
      }

      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onChange(updatedFiles.map((f) => f.file ?? { url: f.preview, id: f.id }));
      e.target.value = "";
    },
    [files, maxLength, onChange, validateFile, cropAspect],
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index);
      setFiles(newFiles);
      onChange(newFiles.map((f) => f.file ?? { url: f.preview, id: f.id }));
    },
    [files, onChange],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-3">
        {files.length < maxLength && (
          <label
            htmlFor={id}
            className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Camera className="h-6 w-6 text-muted-foreground" />
            <span className="mt-1 text-xs text-muted-foreground">
              {files.length}/{maxLength}
            </span>
            <input
              type="file"
              id={id}
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        )}

        {files.map((file, index) => (
          <div key={file.id ?? index} className="relative">
            <div className="relative h-20 w-20 overflow-hidden rounded-lg border">
              <Image
                src={file.preview}
                alt={`Preview ${index + 1}`}
                fill
                className="object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => removeFile(index)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {label && (
        <p className="text-xs text-muted-foreground">{label}</p>
      )}

      {cropSrc ? (
        <BannerCropModal
          imageSrc={cropSrc}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      ) : null}
    </div>
  );
}
