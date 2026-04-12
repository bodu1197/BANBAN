import type { Metadata } from "next";
import { renderRecruitmentPage, generateRecruitmentMetadata } from "@/lib/pages/recruitment-page";

export async function generateMetadata(): Promise<Metadata> {
  return generateRecruitmentMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderRecruitmentPage();
}
