import type { Metadata } from "next";
import { renderPrivacyPage, generatePrivacyMetadata } from "@/lib/pages/privacy-page";

export async function generateMetadata(): Promise<Metadata> {
  return generatePrivacyMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderPrivacyPage();
}
