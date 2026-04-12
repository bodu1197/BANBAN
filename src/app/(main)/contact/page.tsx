import type { Metadata } from "next";
import { renderContactPage, generateContactMetadata } from "@/lib/pages/contact-page";

export async function generateMetadata(): Promise<Metadata> {
  return generateContactMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderContactPage();
}
