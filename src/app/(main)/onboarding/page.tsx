import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isWithinOnboardingWindow, ROLE_ROUTES } from "@/lib/onboarding/constants";
import { OnboardingClient } from "./OnboardingClient";

// /login 에서 SNS 로 신규 가입한 사용자가 회원 유형 선택하는 페이지.
// callback 이 intent 없이 신규 가입을 감지하면 여기로 redirect.

export const metadata: Metadata = {
  title: "회원 유형 선택",
  robots: { index: false, follow: false },
};

export default async function Page(): Promise<React.ReactElement> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  // 이미 다른 role 이면 해당 home 으로
  if (!profile || profile.role !== "user") {
    redirect(profile?.role === "artist" ? ROLE_ROUTES.artist : ROLE_ROUTES.user);
  }

  // 5분 윈도우 초과 시 자동 진입 차단 → 메인으로
  if (!isWithinOnboardingWindow(profile.created_at)) {
    redirect(ROLE_ROUTES.user);
  }

  return <OnboardingClient />;
}
