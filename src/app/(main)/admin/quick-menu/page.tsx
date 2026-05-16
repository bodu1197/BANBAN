// @client-reason: 관리자가 메뉴를 즉시 정렬·수정·업로드할 때 광범위한 인터랙션(드래그 순서, 파일 업로드, 토글)이 필요해 SSR 으로는 흐름을 깔끔하게 표현할 수 없다.
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Check, GripVertical } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminLoadingSpinner, AdminPageHeader } from "@/components/admin/admin-shared";
import { getBannerStorageUrl } from "@/lib/supabase/storage-utils";
import { sanitizeLinkUrl } from "@/lib/url-utils";

interface MenuItem {
  id: string;
  order_index: number;
  label: string;
  icon_path: string;
  link_url: string;
  is_active: boolean;
  updated_at: string;
}

const API_PATH = "/api/admin/quick-menu";
const JSON_HEADERS = { "Content-Type": "application/json" } as const;

interface MenuItemCardProps {
  item: MenuItem;
  onUpdate: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, direction: "up" | "down") => Promise<void>;
  isFirst: boolean;
  isLast: boolean;
}

function getSaveButtonClass(saved: boolean, hasChanges: boolean): string {
  if (saved) return "bg-emerald-500 text-white";
  if (hasChanges) return "bg-pink-500 text-white hover:bg-pink-600 focus-visible:bg-pink-600";
  return "bg-white/10 text-zinc-500 cursor-not-allowed";
}

function SaveIcon({ saved, saving }: Readonly<{ saved: boolean; saving: boolean }>): React.ReactElement {
  if (saved) return <Check className="h-3.5 w-3.5" />;
  if (saving) return <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />;
  return <Save className="h-3.5 w-3.5" />;
}

/* eslint-disable max-lines-per-function -- 한 행에 표시되는 메뉴 카드는 라벨/링크/스위치/저장/삭제가 하나의 인터랙션 단위라 분할하면 가독성이 떨어진다. */
function MenuItemCard({ item, onUpdate, onDelete, onMove, isFirst, isLast }: Readonly<MenuItemCardProps>): React.ReactElement {
  const [label, setLabel] = useState(item.label);
  const [linkUrl, setLinkUrl] = useState(item.link_url);
  const [isActive, setIsActive] = useState(item.is_active);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [iconPath, setIconPath] = useState(item.icon_path);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  const hasChanges = label !== item.label || linkUrl !== item.link_url || isActive !== item.is_active || iconPath !== item.icon_path;
  const safeLinkUrl = sanitizeLinkUrl(linkUrl);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new globalThis.FormData();
      formData.append("file", file);
      const storagePath = `quick-menu/${item.id}-${Date.now()}.webp`;
      const res = await fetch(`/api/upload?bucket=banners&path=${encodeURIComponent(storagePath)}`, { method: "PUT", body: formData });
      const json = (await res.json()) as { success: boolean; path?: string };
      if (json.success && json.path) setIconPath(json.path);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [item.id]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onUpdate(item.id, { label, link_url: safeLinkUrl, is_active: isActive, icon_path: iconPath });
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }, [item.id, label, safeLinkUrl, isActive, iconPath, onUpdate]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    await onDelete(item.id);
  }, [item.id, onDelete]);

  const labelId = `quick-menu-label-${item.id}`;
  const linkId = `quick-menu-link-${item.id}`;

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${isActive ? "border-white/10 bg-white/5" : "border-amber-500/30 bg-amber-500/5"}`}>
      <div className="flex shrink-0 flex-col gap-1">
        <button type="button" disabled={isFirst} onClick={() => { void onMove(item.id, "up"); }} aria-label="위로 이동"
          className="flex h-11 w-11 items-center justify-center rounded text-zinc-500 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
          <ArrowUp className="h-4 w-4" />
        </button>
        <GripVertical className="mx-auto h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
        <button type="button" disabled={isLast} onClick={() => { void onMove(item.id, "down"); }} aria-label="아래로 이동"
          className="flex h-11 w-11 items-center justify-center rounded text-zinc-500 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
          <ArrowDown className="h-4 w-4" />
        </button>
      </div>

      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/10 disabled:cursor-not-allowed"
        aria-label="아이콘 변경">
        {uploading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
        ) : (
          <Image src={getBannerStorageUrl(iconPath)} alt={label} width={40} height={40} sizes="40px" className="h-10 w-10 object-contain" unoptimized />
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" aria-label="아이콘 이미지 선택" />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:flex-row md:items-center md:gap-2">
        <label htmlFor={labelId} className="sr-only">메뉴 이름</label>
        <input id={labelId} type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="메뉴 이름"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:border-pink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-28" />
        <label htmlFor={linkId} className="sr-only">이동할 경로</label>
        <input id={linkId} type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/경로"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:border-pink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex-1" />
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" onClick={() => setIsActive(!isActive)}
          className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "bg-emerald-500" : "bg-zinc-600"}`}
          role="switch" aria-checked={isActive} aria-label={isActive ? "표시됨" : "숨김"}>
          <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-5" : "translate-x-1"}`} />
        </button>

        <button type="button" onClick={handleSave} disabled={saving || !hasChanges}
          className={`flex h-11 w-11 items-center justify-center rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${getSaveButtonClass(saved, hasChanges)}`}
          aria-label="저장">
          <SaveIcon saved={saved} saving={saving} />
        </button>

        <button type="button" onClick={handleDelete} disabled={deleting}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/20 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="삭제">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* eslint-disable max-lines-per-function -- 본문(상단 헤더 + 안내 + 카드 리스트 + 추가 버튼)이 한 흐름으로 표현되어야 가독성이 좋다. */
export default function AdminQuickMenuPage(): React.ReactElement {
  const { isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const movingRef = useRef(false);
  // handleAdd 가 항상 latest items 의 max(order_index) + 1 을 읽어야 하지만 callback
  // 자체는 props 로 내려 button 에 묶이므로 deps 폭발을 피해야 한다 → useRef + 동기 effect.
  const itemsRef = useRef<MenuItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const fetchItems = useCallback(async () => {
    const res = await fetch(API_PATH, { cache: "no-store" });
    if (!res.ok) { setLoading(false); return; }
    const json = (await res.json()) as { items?: MenuItem[] };
    setItems(json.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading) void fetchItems();
  }, [authLoading, fetchItems]);

  const handleUpdate = useCallback(async (id: string, updates: Partial<MenuItem>) => {
    const res = await fetch(API_PATH, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ id, ...updates }) });
    if (!res.ok) return;
    const json = (await res.json()) as { item?: MenuItem };
    const updated = json.item;
    if (updated) setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(API_PATH, { method: "DELETE", headers: JSON_HEADERS, body: JSON.stringify({ id }) });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleMove = useCallback(async (id: string, direction: "up" | "down") => {
    if (movingRef.current) return;
    movingRef.current = true;

    let snapshot: MenuItem[] = [];
    let next: MenuItem[] = [];
    setItems((prev) => {
      snapshot = prev;
      const idx = prev.findIndex((i) => i.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      next = [...prev];
      // eslint-disable-next-line security/detect-object-injection -- idx/swapIdx 는 위에서 length 범위 안임을 검증함.
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });

    if (next.length === 0) {
      movingRef.current = false;
      return;
    }

    const reorder = next.map((item, i) => ({ id: item.id, order_index: i + 1 }));

    try {
      const res = await fetch(API_PATH, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ reorder }) });
      if (!res.ok) {
        setItems(snapshot);
        return;
      }
      const json = (await res.json()) as { items?: MenuItem[] };
      if (json.items) setItems(json.items);
    } catch {
      setItems(snapshot);
    } finally {
      movingRef.current = false;
    }
  }, []);

  const handleAdd = useCallback(async () => {
    setAdding(true);
    try {
      const current = itemsRef.current;
      const nextOrder = current.length > 0
        ? Math.max(...current.map((i) => i.order_index)) + 1
        : 1;
      const res = await fetch(API_PATH, {
        method: "POST", headers: JSON_HEADERS,
        body: JSON.stringify({ label: "새 메뉴", icon_path: "quick-menu/exhibition.png", link_url: "/", order_index: nextOrder }),
      });
      if (!res.ok) return;
      const json = (await res.json()) as { item?: MenuItem };
      const created = json.item;
      if (created) setItems((prev) => [...prev, created]);
    } finally {
      setAdding(false);
    }
  }, []);

  if (authLoading || loading) return <AdminLoadingSpinner />;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AdminPageHeader title="퀵 메뉴 관리" count={items.length} countLabel="개" />

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-zinc-400">
          홈 상단에 표시되는 카테고리 메뉴입니다. 아이콘 클릭으로 이미지를 변경하고, 순서 버튼으로 정렬합니다.
          <br />
          <span className="text-zinc-500">권장 아이콘: 정사각형 PNG, 배경 투명, 200x200px 이상</span>
        </p>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <MenuItemCard
            key={item.id}
            item={item}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onMove={handleMove}
            isFirst={idx === 0}
            isLast={idx === items.length - 1}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={adding}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 text-sm font-medium text-zinc-400 transition-colors hover:border-pink-500/50 hover:text-pink-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-pink-500/50 focus-visible:text-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        메뉴 추가
      </button>
    </div>
  );
}
