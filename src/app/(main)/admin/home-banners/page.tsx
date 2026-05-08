// @client-reason: Admin home banner management with image upload
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Upload, Check, ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminLoadingSpinner, AdminPageHeader } from "@/components/admin/admin-shared";

interface HomeBanner {
  id: string;
  slot: string;
  image_path: string;
  link_url: string;
  alt_text: string;
  is_active: boolean;
  updated_at: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const API_PATH = "/api/admin/home-banners";

const SLOT_LABELS: Record<string, { title: string; description: string }> = {
  exhibition: {
    title: "기획전 배너",
    description: "왼쪽에 표시되는 기획전 배너입니다.",
  },
  "ai-matching": {
    title: "AI 시뮬레이션 배너",
    description: "오른쪽에 표시되는 AI 매칭 배너입니다.",
  },
};

function getBannerImageUrl(imagePath: string): string {
  if (imagePath.startsWith("http")) return imagePath;
  return `${SUPABASE_URL}/storage/v1/object/public/banners/${imagePath}`;
}

function BannerCard({
  banner,
  onSave,
}: Readonly<{
  banner: HomeBanner;
  onSave: (id: string, updates: Partial<HomeBanner>) => Promise<void>;
}>): React.ReactElement {
  const [linkUrl, setLinkUrl] = useState(banner.link_url);
  const [altText, setAltText] = useState(banner.alt_text);
  const [isActive, setIsActive] = useState(banner.is_active);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(getBannerImageUrl(banner.image_path));
  const [currentImagePath, setCurrentImagePath] = useState(banner.image_path);
  const fileRef = useRef<HTMLInputElement>(null);

  const meta = SLOT_LABELS[banner.slot] ?? { title: banner.slot, description: "" };

  const hasChanges =
    linkUrl !== banner.link_url ||
    altText !== banner.alt_text ||
    isActive !== banner.is_active ||
    currentImagePath !== banner.image_path;

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const storagePath = `home/${banner.slot}-${Date.now()}.webp`;
      const res = await fetch(
        `/api/upload?bucket=banners&path=${encodeURIComponent(storagePath)}`,
        { method: "PUT", body: formData }
      );
      const json = (await res.json()) as { success: boolean; path?: string; error?: string };

      if (json.success && json.path) {
        setCurrentImagePath(json.path);
        setPreviewUrl(getBannerImageUrl(json.path));
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [banner.slot]);

  const safeLinkUrl = linkUrl.startsWith("/") ? linkUrl : `/${linkUrl}`;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(banner.id, {
        image_path: currentImagePath,
        link_url: safeLinkUrl,
        alt_text: altText,
        is_active: isActive,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [banner.id, currentImagePath, safeLinkUrl, altText, isActive, onSave]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{meta.title}</h2>
            <p className="mt-0.5 text-sm text-zinc-400">{meta.description}</p>
          </div>
          <button
            type="button"
            onClick={() => { setIsActive(!isActive); }}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive ? "bg-emerald-500" : "bg-zinc-600"
            }`}
            role="switch"
            aria-checked={isActive}
            aria-label={isActive ? "배너 표시됨" : "배너 숨김"}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="relative mb-4 overflow-hidden rounded-xl border border-white/10 bg-black/30">
          <div className="relative aspect-[4/3]">
            <Image
              src={previewUrl}
              alt={altText || meta.title}
              fill
              className="object-cover"
              unoptimized
            />
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg bg-white/90 px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white disabled:opacity-50"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            이미지 변경
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            aria-label="배너 이미지 선택"
          />
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor={`link-${banner.id}`} className="mb-1.5 block text-sm font-medium text-zinc-300">
              클릭 시 이동할 페이지
            </label>
            <input
              id={`link-${banner.id}`}
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/exhibition"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-pink-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-500">
              예: /exhibition, /beauty-sim/my, /discount
            </p>
          </div>

          <div>
            <label htmlFor={`alt-${banner.id}`} className="mb-1.5 block text-sm font-medium text-zinc-300">
              배너 설명 (접근성)
            </label>
            <input
              id={`alt-${banner.id}`}
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="특별 기획전 — 인기 아티스트 콜라보까지"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-pink-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              saved
                ? "bg-emerald-500 text-white"
                : hasChanges
                  ? "bg-pink-500 text-white hover:bg-pink-600 focus-visible:bg-pink-600"
                  : "bg-white/10 text-zinc-500 cursor-not-allowed"
            }`}
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                저장 완료!
              </>
            ) : saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "저장하기"
            )}
          </button>
        </div>
      </div>

      {!isActive ? (
        <div className="border-t border-white/10 bg-amber-500/10 px-5 py-3">
          <p className="text-center text-sm text-amber-400">
            이 배너는 현재 홈페이지에 표시되지 않습니다
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminHomeBannersPage(): React.ReactElement {
  const { isLoading: authLoading } = useAuth();
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBanners = useCallback(async () => {
    const res = await fetch(API_PATH);
    if (!res.ok) { setLoading(false); return; }
    const json = (await res.json()) as { banners?: HomeBanner[] };
    setBanners(json.banners ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading) fetchBanners();
  }, [authLoading, fetchBanners]);

  const handleSave = useCallback(async (id: string, updates: Partial<HomeBanner>) => {
    const res = await fetch(API_PATH, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { banner?: HomeBanner };
    if (json.banner) setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...json.banner as HomeBanner } : b)));
  }, []);

  if (authLoading || loading) return <AdminLoadingSpinner />;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AdminPageHeader title="홈 배너 관리" count={banners.length} countLabel="개" />

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start gap-3">
          <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-pink-400" aria-hidden="true" />
          <div className="text-sm text-zinc-400">
            <p className="font-medium text-zinc-300">배너 이미지 안내</p>
            <p className="mt-1">
              권장 크기: <span className="text-white">1448 x 1086px</span> (4:3 비율)
            </p>
            <p>
              PC에서는 2개 배너가 나란히, 모바일에서는 세로로 표시됩니다.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {banners.map((banner) => (
          <BannerCard key={banner.id} banner={banner} onSave={handleSave} />
        ))}
      </div>
    </div>
  );
}
