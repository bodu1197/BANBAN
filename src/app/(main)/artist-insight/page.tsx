import type { Metadata } from "next";
import { renderInsightPage, generateInsightMetadata } from "@/lib/pages/artist-insight-page";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return generateInsightMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderInsightPage();
}
