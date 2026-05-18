import type { Metadata } from "next";
import {
  renderBoardListPage,
  generateBoardListMetadata,
} from "@/lib/pages/board-list-page";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return generateBoardListMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderBoardListPage();
}
