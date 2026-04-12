import type { Metadata } from "next";
import { renderTermsPage, generateTermsMetadata } from "@/lib/pages/terms-page";

export async function generateMetadata(): Promise<Metadata> {
  return generateTermsMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderTermsPage();
}
