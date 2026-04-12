import type { Metadata } from "next";
import { renderCommunityDetailPage, generateCommunityDetailMetadata } from "@/lib/pages/community-detail-page";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return generateCommunityDetailMetadata(id);
}

export default async function Page({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const { id } = await params;
  return renderCommunityDetailPage(id);
}
