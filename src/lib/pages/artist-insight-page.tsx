import type { Metadata } from "next";
import { getAlternates } from "@/lib/seo";
import { fetchArtistInsights, type ArtistInsight } from "@/lib/supabase/artist-insight-queries";
import { fetchArtistProfileImages } from "@/lib/supabase/blog-queries";
import { fetchRegions } from "@/lib/supabase/queries";
import InsightSearchClient from "@/components/artist-insight/InsightSearchClient";

const PER_PAGE = 20;

export async function generateInsightMetadata(): Promise<Metadata> {
  const title = "아티스트 인사이트 — 타투이스트 종합 분석";
  const description = "대한민국 타투이스트의 작품 스타일, 기술적 강점, 고객 평가를 종합 분석한 아티스트 인사이트.";

  return {
    title,
    description,
    alternates: getAlternates("/artist-insight"),
    openGraph: { title, description, type: "website" },
  };
}

function buildProfileImageRecord(insights: ArtistInsight[], profileImages: Map<string, string>): Record<string, string> {
  const record: Record<string, string> = {};
  for (const insight of insights) {
    const url = profileImages.get(insight.artist_id);
    if (url) record[insight.artist_id] = url;
  }
  return record;
}

export async function renderInsightPage(): Promise<React.ReactElement> {
  const [{ data: insights, count }, regions] = await Promise.all([
    fetchArtistInsights({ limit: PER_PAGE, offset: 0, typeArtist: "SEMI_PERMANENT" }),
    fetchRegions(),
  ]);

  const artistIds = insights.map(i => i.artist_id).filter(Boolean);
  const profileImages = await fetchArtistProfileImages(artistIds);

  const pageTitle = "아티스트 인사이트";

  return (
    <div className="mx-auto w-full max-w-[767px]">
      <header className="border-b border-border px-4 py-4">
        <h1 className="text-lg font-bold">{pageTitle}</h1>
      </header>
      <InsightSearchClient
        initial={{
          insights,
          totalCount: count ?? 0,
          regions,
          profileImages: buildProfileImageRecord(insights, profileImages),
        }}
      />
    </div>
  );
}
