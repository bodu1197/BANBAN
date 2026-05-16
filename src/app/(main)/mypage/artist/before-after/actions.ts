"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type BeforeAfterUpdate = Database["public"]["Tables"]["before_after_photos"]["Update"];

interface ActionResult {
  success: boolean;
  error?: string;
}

interface BeforeAfterEntry {
  id: string;
  title: string | null;
  before_image_path: string;
  after_image_path: string;
  order_index: number;
}

async function authenticateAndVerify(
  artistId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("id, user_id")
    .eq("id", artistId)
    .single();

  if (!artist || artist.user_id !== user.id) {
    return { success: false, error: "forbidden" };
  }

  return { success: true };
}

export async function fetchBeforeAfterPhotos(
  artistId: string,
): Promise<BeforeAfterEntry[]> {
  const auth = await authenticateAndVerify(artistId);
  if (!auth.success) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("before_after_photos")
    .select("id, title, before_image_path, after_image_path, order_index")
    .eq("artist_id", artistId)
    .order("order_index", { ascending: true });

  return (data ?? []) as BeforeAfterEntry[];
}

export async function createBeforeAfterPhoto(input: Readonly<{
  artistId: string;
  title: string;
  beforeImagePath: string;
  afterImagePath: string;
}>): Promise<ActionResult> {
  if (!input.title?.trim()) {
    return { success: false, error: "제목을 입력해주세요" };
  }

  const auth = await authenticateAndVerify(input.artistId);
  if (!auth.success) return auth;

  const admin = createAdminClient();
  const { error } = await admin.from("before_after_photos").insert({
    artist_id: input.artistId,
    title: input.title.trim(),
    before_image_path: input.beforeImagePath,
    after_image_path: input.afterImagePath,
    order_index: 0,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateBeforeAfterPhoto(input: Readonly<{
  artistId: string;
  photoId: string;
  title?: string;
  beforeImagePath?: string;
  afterImagePath?: string;
}>): Promise<ActionResult> {
  const auth = await authenticateAndVerify(input.artistId);
  if (!auth.success) return auth;

  const updates: BeforeAfterUpdate = {};
  // input.title 은 위 `!== undefined` narrowing 으로 string 확정. `|| null` 은
  // 공백만 입력된 경우(`""`)를 null 로 저장하기 위한 의도.
  if (input.title !== undefined) updates.title = input.title.trim() || null;
  if (input.beforeImagePath) updates.before_image_path = input.beforeImagePath;
  if (input.afterImagePath) updates.after_image_path = input.afterImagePath;

  if (Object.keys(updates).length === 0) {
    return { success: false, error: "변경할 항목이 없습니다" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("before_after_photos")
    .update(updates)
    .eq("id", input.photoId)
    .eq("artist_id", input.artistId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteBeforeAfterPhoto(
  artistId: string,
  photoId: string,
): Promise<ActionResult> {
  const auth = await authenticateAndVerify(artistId);
  if (!auth.success) return auth;

  const admin = createAdminClient();
  const { error } = await admin
    .from("before_after_photos")
    .delete()
    .eq("id", photoId)
    .eq("artist_id", artistId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
