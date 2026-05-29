import type { Metadata } from "next";
import {
  renderLocationDetailPage,
  generateLocationDetailMetadata,
} from "@/lib/pages/location-detail-page";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return generateLocationDetailMetadata(slug);
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  return renderLocationDetailPage(slug);
}
