import type { Metadata } from "next";
import { renderArtistsPage, generateArtistsMetadata } from "@/lib/pages/artists-page";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return generateArtistsMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderArtistsPage();
}
