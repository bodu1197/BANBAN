import type { Metadata } from "next";
import { renderInsightDetailPage, generateInsightDetailMetadata } from "@/lib/pages/artist-insight-detail-page";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return generateInsightDetailMetadata(slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  return renderInsightDetailPage(slug);
}
