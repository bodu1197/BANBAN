import type { Metadata } from "next";
import { renderArtistEditPage, artistEditMetadata } from "@/lib/pages/artist-edit-page";

export const metadata: Metadata = artistEditMetadata;

export default async function Page(): Promise<React.ReactElement> {
  return renderArtistEditPage();
}
