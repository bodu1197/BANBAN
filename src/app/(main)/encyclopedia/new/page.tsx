import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/supabase/is-current-user-admin";
import { BoardForm } from "@/components/board/BoardForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "새 글 작성",
  robots: { index: false, follow: false },
};

export default async function Page(): Promise<React.ReactElement> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/login?next=/encyclopedia/new");

  return <BoardForm mode="create" />;
}
