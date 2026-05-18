import type { Metadata } from "next";
import {
  renderBoardDetailPage,
  generateBoardDetailMetadata,
} from "@/lib/pages/board-detail-page";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return generateBoardDetailMetadata(slug);
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  return renderBoardDetailPage(slug);
}
