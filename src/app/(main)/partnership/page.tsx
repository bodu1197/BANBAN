import type { Metadata } from "next";
import { renderPartnershipPage, generatePartnershipMetadata } from "@/lib/pages/partnership-page";

export async function generateMetadata(): Promise<Metadata> {
  return generatePartnershipMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderPartnershipPage();
}
