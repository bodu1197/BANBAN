import type { Metadata } from "next";
import {
  renderEncyclopediaListPage,
  generateEncyclopediaListMetadata,
} from "@/lib/pages/encyclopedia-page";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return generateEncyclopediaListMetadata();
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}): Promise<React.ReactElement> {
  const { category } = await searchParams;
  return renderEncyclopediaListPage({ category: category ?? null });
}
