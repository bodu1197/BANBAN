"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

export interface ReportResult {
  success: boolean;
  alreadyReported?: boolean;
  error?: string;
}

const REPORT_REASON_WHITELIST = new Set(["SPAM", "ABUSE", "ADULT", "HATE", "OTHER"]);
const REPORTABLE_TYPE_WHITELIST = new Set(["post", "portfolio", "artist"]);
const REPORT_DESCRIPTION_MAX = 500;

export async function reportContent(
  reportableType: string,
  reportableId: string,
  reason: string,
  description?: string,
): Promise<ReportResult> {
  const user = await getUser();
  if (!user) return { success: false, error: "unauthorized" };

  if (!REPORTABLE_TYPE_WHITELIST.has(reportableType)) {
    return { success: false, error: "invalid reportable type" };
  }

  const trimmedReason = reason.trim();
  if (!REPORT_REASON_WHITELIST.has(trimmedReason)) {
    return { success: false, error: "invalid reason" };
  }

  const trimmedDescription = description?.trim() ?? null;
  if (trimmedDescription && trimmedDescription.length > REPORT_DESCRIPTION_MAX) {
    return { success: false, error: "description too long" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("reporter_id", user.id)
    .eq("reportable_type", reportableType)
    .eq("reportable_id", reportableId)
    .maybeSingle();

  if (existing) {
    return { success: true, alreadyReported: true };
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reportable_type: reportableType,
    reportable_id: reportableId,
    reason: trimmedReason,
    description: trimmedDescription,
    status: "PENDING",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/portfolios/${reportableId}`);
  return { success: true };
}
