"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface CreateRecruitmentInput {
  title: string;
  description?: string;
  parts?: string;
  expense: number;
  condition?: string;
  closedAt: string;
}

type ActionResult = { success: boolean; id?: string; error?: string };

const REVALIDATE_PATH = "/recruitment";

async function getAuthenticatedUser(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; userId: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

export async function createRecruitment(input: CreateRecruitmentInput): Promise<ActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth) return { success: false, error: "LOGIN_REQUIRED" };

  const { data: artist } = await auth.supabase
    .from("artists")
    .select("id")
    .eq("user_id", auth.userId)
    .single();

  if (!artist) return { success: false, error: "ARTIST_ONLY" };

  const { data, error } = await auth.supabase
    .from("recruitments")
    .insert({
      artist_id: artist.id,
      title: input.title,
      description: input.description ?? null,
      parts: input.parts ?? null,
      expense: input.expense,
      condition: input.condition ?? null,
      closed_at: input.closedAt,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { success: true, id: data.id };
}

function buildUpdateData(input: Partial<CreateRecruitmentInput>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description || null;
  if (input.parts !== undefined) data.parts = input.parts || null;
  if (input.expense !== undefined) data.expense = input.expense;
  if (input.condition !== undefined) data.condition = input.condition || null;
  if (input.closedAt !== undefined) data.closed_at = input.closedAt;
  return data;
}

export async function updateRecruitment(
  id: string,
  input: Partial<CreateRecruitmentInput>,
): Promise<ActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth) return { success: false, error: "LOGIN_REQUIRED" };

  const { data: artist } = await auth.supabase
    .from("artists")
    .select("id")
    .eq("user_id", auth.userId)
    .single();

  if (!artist) return { success: false, error: "ARTIST_ONLY" };

  const { error } = await auth.supabase
    .from("recruitments")
    .update(buildUpdateData(input))
    .eq("id", id)
    .eq("artist_id", artist.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
}

export async function deleteRecruitment(id: string): Promise<ActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth) return { success: false, error: "LOGIN_REQUIRED" };

  const { data: artist } = await auth.supabase
    .from("artists")
    .select("id")
    .eq("user_id", auth.userId)
    .single();

  if (!artist) return { success: false, error: "ARTIST_ONLY" };

  const { error } = await auth.supabase
    .from("recruitments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("artist_id", artist.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
}
