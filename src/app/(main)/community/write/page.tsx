import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { getUser } from "@/lib/supabase/auth";
import { PostWriteClient } from "./PostWriteClient";

export const metadata: Metadata = {
  title: STRINGS.community.writePost,
};

export default async function Page(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");

  return <PostWriteClient />;
}
