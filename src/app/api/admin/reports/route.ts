import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  return !!(data as { is_admin: boolean } | null)?.is_admin;
}

interface ReportRow {
  id: string;
  reporter_id: string;
  reportable_type: string;
  reportable_id: string;
  reason: string | null;
  description: string | null;
  status: string;
  reviewed_at: string | null;
  created_at: string;
}

export async function GET(): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as ReportRow[];

  const reporterIds = [...new Set(rows.map((r) => r.reporter_id))];
  const { data: reporters } = await supabase
    .from("profiles")
    .select("id, nickname, email")
    .in("id", reporterIds);

  const reporterMap = new Map(
    (reporters ?? []).map((p) => {
      const profile = p as { id: string; nickname: string; email: string | null };
      return [profile.id, profile];
    }),
  );

  const reports = rows.map((r) => ({
    ...r,
    reporter: reporterMap.get(r.reporter_id) ?? null,
  }));

  return NextResponse.json({ reports });
}

const VALID_STATUSES = new Set(["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PatchBody { id: string; status: string; action?: string; targetId?: string }

function validatePatchInput(body: PatchBody): boolean {
  if (!body.id || !UUID_RE.test(body.id)) return false;
  if (!VALID_STATUSES.has(body.status)) return false;
  if (body.targetId && !UUID_RE.test(body.targetId)) return false;
  return true;
}

async function softDeleteReportedContent(
  supabase: ReturnType<typeof createAdminClient>, reportId: string, targetId: string,
): Promise<void> {
  const { data: report } = await supabase.from("reports").select("reportable_type, reportable_id").eq("id", reportId).single();
  const row = report as { reportable_type: string; reportable_id: string } | null;
  if (!row || row.reportable_id !== targetId) return;
  const now = new Date().toISOString();
  if (row.reportable_type === "post") {
    await supabase.from("posts").update({ deleted_at: now }).eq("id", targetId);
  } else if (row.reportable_type === "portfolio") {
    await supabase.from("portfolios").update({ deleted_at: now }).eq("id", targetId);
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: PatchBody;
  try { body = await request.json() as PatchBody; }
  catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  if (!validatePatchInput(body)) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reports")
    .update({ status: body.status, reviewed_at: new Date().toISOString() })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.action === "delete_content" && body.targetId) {
    await softDeleteReportedContent(supabase, body.id, body.targetId);
  }

  return NextResponse.json({ success: true });
}
