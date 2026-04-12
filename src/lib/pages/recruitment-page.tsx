import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { fetchRecruitments } from "@/lib/supabase/home-recruitment-queries";
import { RecruitmentListClient } from "@/components/recruitment/RecruitmentListClient";

export async function generateRecruitmentMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.recruitment,
    description: STRINGS.pages.recruitmentDesc,
    alternates: getAlternates("/recruitment"),
  };
}

export async function renderRecruitmentPage(): Promise<React.ReactElement> {
  const recruitments = await fetchRecruitments({ limit: 50 });

  return (
    <main className="mx-auto w-full max-w-[767px] px-4 py-6">
      <RecruitmentListClient
        recruitments={recruitments}
        labels={STRINGS.recruitment}
      />
    </main>
  );
}
