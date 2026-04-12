// @client-reason: File input handling and image preview
"use client";

import { useId, useState, useCallback } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

export function ImageUpload({
  maxLength = 5,
  label,
  defaultImages = [],
  onChange,
  className,
}: Readonly<ImageUploadProps>): React.ReactElement {
  const id = useId();
  // Initialize files from defaultImages using lazy initializer
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

      const filesToAdd = Array.from(selectedFiles).slice(0, remainingSlots);
      const newFiles: ImageFile[] = [];

      for (const file of filesToAdd) {
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        });

        newFiles.push({
          file,
          preview,
          isExisting: false,
        });
      }

      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onChange(
        updatedFiles.map((f) => f.file ?? { url: f.preview, id: f.id })
      );

      e.target.value = "";
    },
    [files, maxLength, onChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index);
      setFiles(newFiles);
      onChange(
        newFiles.map((f) => f.file ?? { url: f.preview, id: f.id })
      );
    },
    [files, onChange]
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-3">
        {/* Add button */}
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

        {/* Image previews */}
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
    </div>
  );
}
