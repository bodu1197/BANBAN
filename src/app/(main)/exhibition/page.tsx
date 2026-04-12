import type { Metadata } from "next";
import { renderExhibitionPage, generateExhibitionMetadata } from "@/lib/pages/exhibition-page";

export async function generateMetadata(): Promise<Metadata> {
  return generateExhibitionMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderExhibitionPage();
}
