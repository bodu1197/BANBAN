// @client-reason: file input handling and upload state management
"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface ImageUploaderProps {
  images: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

function ImageThumbnail({ url, index, disabled, onRemove }: Readonly<{
  url: string; index: number; disabled: boolean; onRemove: (i: number) => void;
}>): React.ReactElement {
  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
      <Image src={url} alt={`첨부 ${index + 1}`} fill className="object-cover" sizes="80px" />
      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={disabled}
        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="이미지 삭제"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

async function uploadFiles(
  files: FileList,
  currentCount: number,
  maxImages: number,
): Promise<string[]> {
  const newUrls: string[] = [];
  for (const file of Array.from(files)) {
    if (currentCount + newUrls.length >= maxImages) break;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/inquiries/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json() as { url: string };
        newUrls.push(data.url);
      }
    } catch {
      // skip failed uploads
    }
  }
  return newUrls;
}

export function ImageUploader({
  images,
  onChange,
  maxImages = 3,
  disabled = false,
}: Readonly<ImageUploaderProps>): React.ReactElement {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls = await uploadFiles(files, images.length, maxImages);
    if (newUrls.length > 0) onChange([...images, ...newUrls]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (index: number): void => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <ImageThumbnail key={url} url={url} index={i} disabled={disabled} onRemove={handleRemove} />
        ))}
        {images.length < maxImages && (
          <label className={`flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 transition-colors hover:border-muted-foreground/50 focus-visible:outline-none ${disabled || uploading ? "pointer-events-none opacity-50" : ""}`}>
            {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
            <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleUpload} disabled={disabled || uploading} className="hidden" />
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">이미지 {images.length}/{maxImages} (최대 5MB)</p>
    </div>
  );
}

/** 읽기 전용 이미지 목록 표시 */
export function ImageList({ images }: Readonly<{ images: string[] }>): React.ReactElement | null {
  if (images.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {images.map((url, i) => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="relative h-20 w-20 overflow-hidden rounded-lg border border-border transition-opacity hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Image src={url} alt={`첨부 ${i + 1}`} fill className="object-cover" sizes="80px" />
        </a>
      ))}
    </div>
  );
}
