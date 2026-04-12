import type { Metadata } from "next";
import { renderCommunityPage, generateCommunityMetadata } from "@/lib/pages/community-page";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return generateCommunityMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderCommunityPage();
}
