import type { Metadata } from "next";
import { renderHomePage, generateHomeMetadata } from "@/lib/pages/home-page";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return generateHomeMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderHomePage();
}
