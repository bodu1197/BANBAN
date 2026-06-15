import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { studyEntitlement, type StudyAccess } from "@/lib/study/entitlement";
import { StudyNav } from "@/components/study/StudyNav";
import { StudyLockedView, type StudyLockReason } from "@/components/study/StudyLockedView";

// 인증·1인 데이터 게이트 → 항상 동적.
export const dynamic = "force-dynamic";

/** artists 공개 여부 → 공부방 접근. '오픈된 샵 = 무조건 무제한'(2026-06-15).
 *  잠금 사유는 entitlement 판정과 같은 자리에서 확정해 컴포넌트가 재추론하지 않게 한다. */
async function resolveStudyAccess(userId: string): Promise<{ access: StudyAccess; lockReason: StudyLockReason }> {
  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("approved_at, is_hide")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!artist) return { access: studyEntitlement(null).access, lockReason: "no-shop" };

  const isHide = artist.is_hide === true;
  const access = studyEntitlement({ approvedAt: artist.approved_at, isHide }).access;
  // 숨김(테이크다운)이 미오픈(draft)보다 우선 — 숨김 상태는 완성해도 자가 공개 불가, 재검토 요청이 필요.
  // 오픈된 샵은 잠기지 않으므로(access=unlimited) 이 사유는 표시되지 않는다.
  const lockReason: StudyLockReason = isHide ? "hidden" : "draft";
  return { access, lockReason };
}

export default async function StudyLayout({ children }: Readonly<{ children: React.ReactNode }>): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");

  const { access, lockReason } = await resolveStudyAccess(user.id);
  if (access === "locked") return <StudyLockedView reason={lockReason} />;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1024px] bg-background px-4 sm:px-6">
      <StudyNav />
      {children}
    </div>
  );
}
