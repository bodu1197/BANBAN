import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookText } from "lucide-react";
import { getUser } from "@/lib/supabase/auth";
import { GLOSSARY, GLOSSARY_CATEGORIES } from "@/data/study/glossary";
import { GlossaryFilter } from "@/components/study/GlossaryFilter";

export const metadata: Metadata = { title: "용어사전 | 문신사 공부방", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function GlossaryPage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  return (
    <div>
      <div className="flex items-center gap-2.5 pt-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary"><BookText className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        <h1 className="text-xl font-bold">용어사전</h1>
      </div>
      <GlossaryFilter terms={GLOSSARY} categories={GLOSSARY_CATEGORIES} />
    </div>
  );
}
