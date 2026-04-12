import type { Metadata } from "next";
import {
  renderEncyclopediaDetailPage,
  generateEncyclopediaDetailMetadata,
} from "@/lib/pages/encyclopedia-detail-page";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return generateEncyclopediaDetailMetadata(slug);
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  return renderEncyclopediaDetailPage(slug);
}
