"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// ─── Types ───────────────────────────────────────────────

export interface SubmitEntryResult {
  success: boolean;
  error?: string;
}

interface EntryRow { id: string; artist_id: string; status: string }
interface ExhibitionRow { id: string; is_active: boolean; end_at: string | null }
interface ArtistRow { id: string }
interface PortfolioOwner { artist_id: string }

const fail = (error: string): SubmitEntryResult => ({ success: false, error });

// ─── Helpers ─────────────────────────────────────────────

function revalidateExhibitionPaths(): void {
  revalidatePath("/exhibition", "page");
}

async function getArtistForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ArtistRow | null> {
  const { data } = await supabase
    .from("artists").select("id")
    .eq("user_id", userId).is("deleted_at", null)
    .maybeSingle() as { data: ArtistRow | null };
  return data;
}

async function checkIsAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", userId).single();
  return (data as { is_admin: boolean } | null)?.is_admin === true;
}

async function getPortfolioOwner(
  supabase: SupabaseClient<Database>,
  portfolioId: string,
): Promise<PortfolioOwner | null> {
  const { data } = await supabase
    .from("portfolios").select("artist_id")
    .eq("id", portfolioId).is("deleted_at", null)
    .single() as { data: PortfolioOwner | null };
  return data;
}

async function validateExhibition(
  supabase: SupabaseClient<Database>,
  exhibitionId: string,
): Promise<SubmitEntryResult | null> {
  const { data: exhibition } = await supabase
    .from("exhibitions").select("id, is_active, end_at")
    .eq("id", exhibitionId).single() as { data: ExhibitionRow | null };

  if (!exhibition) return fail("exhibition_not_found");
  if (!exhibition.is_active) return fail("exhibition_inactive");
  if (exhibition.end_at && new Date(exhibition.end_at) < new Date()) return fail("exhibition_ended");
  return null;
}

// ─── Actions ─────────────────────────────────────────────

/**
 * Submit a portfolio to an exhibition.
 * Uses the portfolio's artist_id (not the logged-in user's) so admins
 * can submit on behalf of artists without overriding ownership.
 */
export async function submitExhibitionEntry(
  exhibitionId: string,
  portfolioId: string,
): Promise<SubmitEntryResult> {
  const user = await getUser();
  if (!user) return fail("unauthorized");

  const supabase = await createClient();

  // Resolve the portfolio's actual owner
  const portfolio = await getPortfolioOwner(supabase, portfolioId);
  if (!portfolio) return fail("portfolio_not_found");

  // Verify: current user is the owner OR is admin
  const userArtist = await getArtistForUser(supabase, user.id);
  const isOwner = userArtist?.id === portfolio.artist_id;
  const isAdmin = !isOwner && await checkIsAdmin(supabase, user.id);
  if (!isOwner && !isAdmin) return fail("forbidden");

  const validationError = await validateExhibition(supabase, exhibitionId);
  if (validationError) return validationError;

  const { data: existing } = await supabase
    .from("exhibition_entries").select("id")
    .eq("exhibition_id", exhibitionId).eq("portfolio_id", portfolioId)
    .eq("artist_id", portfolio.artist_id).maybeSingle() as { data: EntryRow | null };

  if (existing) return fail("already_submitted");

  const { error } = await (supabase.from("exhibition_entries").insert as unknown as (
    data: Record<string, string>
  ) => Promise<{ error: { message: string } | null }>)({
    exhibition_id: exhibitionId, portfolio_id: portfolioId, artist_id: portfolio.artist_id,
  });

  if (error) return fail(error.message);
  revalidateExhibitionPaths();
  return { success: true };
}

/**
 * Withdraw (delete) a pending entry.
 * Allows the owning artist or an admin to withdraw.
 */
export async function withdrawExhibitionEntry(entryId: string): Promise<SubmitEntryResult> {
  const user = await getUser();
  if (!user) return fail("unauthorized");

  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("exhibition_entries").select("id, artist_id, status")
    .eq("id", entryId).single() as { data: EntryRow | null };

  if (!entry) return fail("entry_not_found");
  if (entry.status !== "pending") return fail("not_pending");

  const userArtist = await getArtistForUser(supabase, user.id);
  const isOwner = userArtist?.id === entry.artist_id;
  const isAdmin = !isOwner && await checkIsAdmin(supabase, user.id);
  if (!isOwner && !isAdmin) return fail("forbidden");

  const { error } = await supabase.from("exhibition_entries").delete().eq("id", entryId);
  if (error) return fail(error.message);

  revalidateExhibitionPaths();
  return { success: true };
}
