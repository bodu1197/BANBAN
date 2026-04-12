import type { Metadata } from "next";
import { renderAboutPage, generateAboutMetadata } from "@/lib/pages/about-page";

export async function generateMetadata(): Promise<Metadata> {
  return generateAboutMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderAboutPage();
}
