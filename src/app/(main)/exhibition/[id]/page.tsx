import type { Metadata } from "next";
import {
  renderExhibitionDetailPage,
  generateExhibitionDetailMetadata,
} from "@/lib/pages/exhibition-detail-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return generateExhibitionDetailMetadata(id);
}

export default async function Page({ params }: Readonly<PageProps>): Promise<React.ReactElement> {
  const { id } = await params;
  return renderExhibitionDetailPage(id);
}
