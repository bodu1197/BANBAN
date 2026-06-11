import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { getStudyChecklist } from "@/lib/study/queries";
import { ChecklistBoard } from "@/components/study/ChecklistBoard";

export const metadata: Metadata = { title: "실기 체크리스트 | 문신사 공부방", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ChecklistPage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  const initialChecked = await getStudyChecklist(user.id);
  return <ChecklistBoard initialChecked={initialChecked} />;
}
