import type { Metadata } from "next";
import { renderAiStudioPage, generateAiStudioMetadata } from "@/lib/pages/ai-studio-page";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return generateAiStudioMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderAiStudioPage();
}
