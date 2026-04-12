import type { Metadata } from "next";
import { renderBlogDetailPage, generateBlogDetailMetadata } from "@/lib/pages/blog-detail-page";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return generateBlogDetailMetadata(slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  return renderBlogDetailPage(slug);
}
