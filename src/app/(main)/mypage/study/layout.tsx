import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { studyEntitlement, type StudyAccess } from "@/lib/study/entitlement";
import { StudyNav } from "@/components/study/StudyNav";
import { StudyLockedView } from "@/components/study/StudyLockedView";

// 인증·1인 데이터 게이트 → 항상 동적.
export const dynamic = "force-dynamic";

/** artists 공개 여부(approved_at) → 공부방 접근. '오픈된 샵 = 무조건 무제한'(2026-06-15). */
async function resolveStudyAccess(userId: string): Promise<{ access: StudyAccess; hasShop: boolean; approved: boolean }> {
  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("approved_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!artist) return { access: studyEntitlement(null).access, hasShop: false, approved: false };

  const approved = artist.approved_at !== null;
  return { access: studyEntitlement({ approvedAt: artist.approved_at }).access, hasShop: true, approved };
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
