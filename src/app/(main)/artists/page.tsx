import type { Metadata } from "next";
import { renderArtistsPage, generateArtistsMetadata } from "@/lib/pages/artists-page";

// 필터는 useUrlSearchParams 로 읽는다 — 근거는 그 훅의 JSDoc 참조(src/hooks/useUrlSearchParams.ts).
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return generateArtistsMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderArtistsPage();
}
