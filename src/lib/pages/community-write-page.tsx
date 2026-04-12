import { redirect } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { getUser } from "@/lib/supabase/auth";
import { CommunityWriteClient } from "@/components/community/CommunityWriteClient";

export async function renderCommunityWritePage(): Promise<React.ReactElement> {
  const user = await getUser().catch(() => null);

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-[767px] px-4 py-6">
      <CommunityWriteClient
        labels={STRINGS.community}
      />
    </main>
  );
}
