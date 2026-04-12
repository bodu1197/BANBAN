import type { Metadata } from "next";
import { renderPortfoliosPage, generatePortfoliosMetadata } from "@/lib/pages/portfolios-page";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return generatePortfoliosMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderPortfoliosPage();
}
