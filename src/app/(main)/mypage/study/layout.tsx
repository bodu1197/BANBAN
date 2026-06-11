import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { studyEntitlement, type StudyAccess } from "@/lib/study/entitlement";
import { ensureTrialStarted } from "@/lib/actions/study-progress";
import { StudyNav } from "@/components/study/StudyNav";
import { StudyLockedView } from "@/components/study/StudyLockedView";
import { StudyTrialBanner } from "@/components/study/StudyTrialBanner";

// 인증·1인 데이터 게이트 → 항상 동적.
export const dynamic = "force-dynamic";

type StudyArtistRow = { status: string; approved_at: string | null } | null;

/** pending & 체험 미시작이면 7일 체험 개시 후 저장값 재조회. 그 외엔 현재 값 유지. */
async function resolveTrialStart(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  artist: StudyArtistRow,
  trialStartedAt: number | null,
): Promise<number | null> {
  if (!artist || artist.approved_at !== null || artist.status !== "pending" || trialStartedAt !== null) return trialStartedAt;
  await ensureTrialStarted();
  const { data: fresh } = await admin
    .from("study_user_settings").select("trial_started_at").eq("user_id", userId).maybeSingle();
  return fresh?.trial_started_at ? Date.parse(fresh.trial_started_at) : null;
}

/** artists.status/approved_at + 체험 시작일 → 공부방 접근 권한. */
async function resolveStudyAccess(userId: string): Promise<{ access: StudyAccess; trialDaysLeft: number; hasShop: boolean }> {
  const admin = createAdminClient();
  const [{ data: artist }, { data: settings }] = await Promise.all([
    admin.from("artists").select("status, approved_at").eq("user_id", userId).is("deleted_at", null).maybeSingle(),
    admin.from("study_user_settings").select("trial_started_at").eq("user_id", userId).maybeSingle(),
  ]);

  const initialTrial = settings?.trial_started_at ? Date.parse(settings.trial_started_at) : null;
  const trialStartedAt = await resolveTrialStart(admin, userId, artist, initialTrial);
  const gate = studyEntitlement(artist ? { status: artist.status, approvedAt: artist.approved_at } : null, trialStartedAt);
  return { access: gate.access, trialDaysLeft: gate.trialDaysLeft, hasShop: Boolean(artist) };
}

export default async function StudyLayout({ children }: Readonly<{ children: React.ReactNode }>): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");

  const { access, trialDaysLeft, hasShop } = await resolveStudyAccess(user.id);
  if (access === "locked") return <StudyLockedView hasShop={hasShop} />;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1024px] bg-background px-4 sm:px-6">
      <StudyNav />
      {access === "trial" ? <StudyTrialBanner daysLeft={trialDaysLeft} /> : null}
      {children}
    </div>
  );
}
