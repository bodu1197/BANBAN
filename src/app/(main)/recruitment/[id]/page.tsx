import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { fetchRecruitmentById } from "@/lib/supabase/home-recruitment-queries";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { RecruitmentDetailClient } from "@/components/recruitment/RecruitmentDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Readonly<PageProps>): Promise<Metadata> {
  const { id } = await params;
  const recruitment = await fetchRecruitmentById(id);
  if (!recruitment) return { title: STRINGS.recruitment.listTitle };
  const desc = recruitment.description?.slice(0, 160);
  return {
    title: recruitment.title,
    description: desc,
    openGraph: {
      title: recruitment.title,
      description: desc,
      type: "article",
    },
  };
}

async function getArtistId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("artists").select("id").eq("user_id", userId).single();
  return data?.id ?? null;
}

export default async function Page({ params }: Readonly<PageProps>): Promise<React.ReactElement> {
  const { id } = await params;
  const [recruitment, user] = await Promise.all([
    fetchRecruitmentById(id),
    getUser(),
  ]);

  if (!recruitment) notFound();

  const artistId = user ? await getArtistId(user.id) : null;
  const isOwner = artistId === recruitment.artistId;

  return (
    <main className="mx-auto w-full max-w-[767px] px-4 py-6">
      <RecruitmentDetailClient
        recruitment={recruitment}
        labels={STRINGS.recruitment}
        isOwner={isOwner}
      />
    </main>
  );
}
