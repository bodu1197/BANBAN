import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { studyEntitlement, type StudyAccess } from "@/lib/study/entitlement";
import { StudyNav } from "@/components/study/StudyNav";
import { StudyLockedView } from "@/components/study/StudyLockedView";

// 인증·1인 데이터 게이트 → 항상 동적.
export const dynamic = "force-dynamic";

/** artists 완성도(status/approved_at/배너/포폴수) → 공부방 접근 권한. 체험 폐지: 승인+완성만 무제한. */
async function resolveStudyAccess(userId: string): Promise<{ access: StudyAccess; hasShop: boolean; approved: boolean }> {
  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("id, status, approved_at, banner_path")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!artist) return { access: studyEntitlement(null).access, hasShop: false, approved: false };

  const { count } = await admin
    .from("portfolios")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", artist.id)
    .is("deleted_at", null);

  const gate = studyEntitlement({
    status: artist.status,
    approvedAt: artist.approved_at,
    hasBanner: artist.banner_path !== null && artist.banner_path !== "",
    portfolioCount: count ?? 0,
  });
  return { access: gate.access, hasShop: true, approved: artist.approved_at !== null };
}

export default async function StudyLayout({ children }: Readonly<{ children: React.ReactNode }>): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");

  const { access, hasShop, approved } = await resolveStudyAccess(user.id);
  if (access === "locked") return <StudyLockedView hasShop={hasShop} approved={approved} />;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1024px] bg-background px-4 sm:px-6">
      <StudyNav />
      {children}
    </div>
  );
}
