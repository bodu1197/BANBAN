import type { Metadata } from "next";
import { renderBlogPage, generateBlogMetadata } from "@/lib/pages/blog-page";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return generateBlogMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderBlogPage();
}
