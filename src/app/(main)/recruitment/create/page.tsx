import { redirect } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { getUser } from "@/lib/supabase/auth";
import { RecruitmentCreateClient } from "@/components/recruitment/RecruitmentCreateClient";

export default async function Page(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-[767px] px-4 py-6">
      <RecruitmentCreateClient labels={STRINGS.recruitment} />
    </main>
  );
}
